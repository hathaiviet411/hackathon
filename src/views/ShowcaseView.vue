<script setup lang="ts">
import { ref, computed } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import DynamicForm from '@/components/forms/DynamicForm.vue'
import DataTable from '@/components/data/DataTable.vue'
import AgentTraceStream from '@/components/agent/AgentTraceStream.vue'
import ChatAssistant from '@/components/chat/ChatAssistant.vue'
import MarkdownContent from '@/components/chat/MarkdownContent.vue'
import CameraCapture from '@/components/media/CameraCapture.vue'
import FileUploader from '@/components/media/FileUploader.vue'
import { AiGateway } from '@/services/AiGateway'
import { LocalDataStore } from '@/services/LocalDataStore'
import { DEFAULT_SYSTEM_PROMPT, getModelOption, LOCAL_MODELS } from '@/config/ai'
import { createTurnLock } from '@/utils/inferenceGuard'
import { toSafePromptText, usePlainTextPaste } from '@/utils/plainTextPaste'
import { useAppStore } from '@/stores/app'
import { useAiEngineStore } from '@/stores/aiEngine'
import type { ChatMessage, ExtractedFileResult, FormSchema, TableColumn } from '@/types'
import formSchemaJson from '@/schemas/formSchema.example.json'
import sampleData from '@/mocks/sampleTableData.json'
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  Separator,
} from 'radix-vue'
import { Cpu, Loader2 } from 'lucide-vue-next'

const formSchema = formSchemaJson as FormSchema
const appStore = useAppStore()
const aiStore = useAiEngineStore()

// Module 1: Forms & Data
const tableRows = ref<Record<string, unknown>[]>([...sampleData])
const tableColumns: TableColumn[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'label', label: 'Label', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'quantity', label: 'Qty', sortable: true },
  { key: 'active', label: 'Active' },
  { key: 'effectiveDate', label: 'Date', sortable: true },
]

function onFormSubmit(data: Record<string, unknown>) {
  const newRow = {
    id: String(tableRows.value.length + 1),
    ...data,
  }
  tableRows.value.unshift(newRow)
}

// Module 2: Chat
const chatMessages = ref<ChatMessage[]>([])
const chatTurnLock = createTurnLock('Chat.onChatSend')
const isChatStreaming = computed(() => chatTurnLock.isLocked)

// Module 3: AI Engine
const aiPrompt = ref('')
const isModelLoaded = ref(false)
const engineTurnLock = createTurnLock('AI.onAiGenerate')
const isInferring = computed(() => engineTurnLock.isLocked)
const aiExchanges = ref<{
  id: string
  prompt: string
  response: string
  status: 'streaming' | 'done' | 'error'
}[]>([])
const systemPrompt = ref(DEFAULT_SYSTEM_PROMPT)
const baseSystemPrompt = ref(DEFAULT_SYSTEM_PROMPT)
const loadedContextBanner = ref<string | null>(null)
const onAiPromptPaste = usePlainTextPaste(aiPrompt, { singleLine: true })
const onSystemPromptPaste = usePlainTextPaste(systemPrompt)
const engineHistoryTurns = ref(0)
const selectedModelId = ref<string>(AiGateway.getModelId())
const isSwitchingModel = ref(false)

const selectedModel = computed(() => getModelOption(selectedModelId.value))

const routingOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'local', label: 'Local (Edge)' },
  { value: 'cloud', label: 'Cloud' },
]

async function loadModel() {
  try {
    await AiGateway.init({
      mode: aiStore.routingMode,
      modelId: selectedModelId.value,
    })
    isModelLoaded.value = true
  } catch (e) {
    console.error('Model load failed:', e)
    isModelLoaded.value = false
  }
}

async function onModelChange(value: string | undefined) {
  if (!value || value === selectedModelId.value || isSwitchingModel.value) return

  selectedModelId.value = value
  const modelChanged = AiGateway.setModelId(value)
  if (!modelChanged) return

  const shouldReload = isModelLoaded.value
  if (shouldReload) {
    isSwitchingModel.value = true
    isModelLoaded.value = false
    AiGateway.terminate()
    try {
      await loadModel()
    } finally {
      isSwitchingModel.value = false
    }
  }
}

function onChatSend(message: string) {
  if (!chatTurnLock.tryAcquire()) return

  const content = toSafePromptText(message)
  if (!content) {
    chatTurnLock.release()
    return
  }

  chatMessages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    content,
  })
  void runChatInference(content)
}

async function runChatInference(prompt: string) {
  const assistantId = crypto.randomUUID()
  let inferenceError: string | null = null

  try {
    if (!isModelLoaded.value) {
      await loadModel()
      if (!isModelLoaded.value) {
        throw new Error('Không thể tải model AI')
      }
    }

    chatMessages.value.push({ id: assistantId, role: 'assistant', content: '' })

    const result = await AiGateway.generate(
      prompt,
      {
        onToken: (token: string) => {
          const msg = chatMessages.value.find((m) => m.id === assistantId)
          if (msg && token) msg.content += token
        },
        onError: (message: string) => {
          inferenceError = message
        },
      },
      aiStore.routingMode,
      { session: 'chat' },
    )

    if (!result.trim() && inferenceError) {
      const msg = chatMessages.value.find((m) => m.id === assistantId)
      if (msg && !msg.content.trim()) {
        msg.content = inferenceError
      }
    }
  } catch (e) {
    const msg = chatMessages.value.find((m) => m.id === assistantId)
    if (msg && !msg.content.trim()) {
      msg.content = e instanceof Error ? e.message : 'Inference failed'
    }
  } finally {
    chatTurnLock.release()
    chatMessages.value = chatMessages.value.filter(
      (m) => m.role !== 'assistant' || m.content.trim().length > 0,
    )
  }
}

async function onAiGenerate() {
  const prompt = toSafePromptText(aiPrompt.value)
  if (!prompt || !engineTurnLock.tryAcquire()) return

  aiPrompt.value = ''

  let exchangeIndex = -1

  try {
    if (!isModelLoaded.value) {
      await loadModel()
      if (!isModelLoaded.value) {
        throw new Error('Không thể tải model AI')
      }
    }

    AiGateway.setSystemPrompt(systemPrompt.value)

    exchangeIndex = aiExchanges.value.length
    aiExchanges.value.push({ id: crypto.randomUUID(), prompt, response: '', status: 'streaming' })

    await AiGateway.generate(
      prompt,
      {
        onToken: (token: string) => {
          if (!token) return
          const current = aiExchanges.value[exchangeIndex]
          aiExchanges.value[exchangeIndex] = {
            ...current,
            response: current.response + token,
            status: 'streaming',
          }
        },
      },
      aiStore.routingMode,
      { session: 'engine', systemPrompt: systemPrompt.value },
    )

    const current = aiExchanges.value[exchangeIndex]
    aiExchanges.value[exchangeIndex] = {
      ...current,
      status: current.response.trim() ? 'done' : 'error',
    }
    engineHistoryTurns.value = Math.floor(AiGateway.getHistory('engine').length / 2)
  } catch (e) {
    if (exchangeIndex >= 0) {
      const current = aiExchanges.value[exchangeIndex]
      aiExchanges.value[exchangeIndex] = {
        ...current,
        response: current.response || (e instanceof Error ? e.message : 'Inference failed'),
        status: 'error',
      }
    }
  } finally {
    engineTurnLock.release()
  }
}

function onRoutingChange(value: string | undefined) {
  if (!value) return
  aiStore.setRoutingMode(value as 'auto' | 'local' | 'cloud')
}

function onSystemPromptChange() {
  baseSystemPrompt.value = systemPrompt.value
  AiGateway.setSystemPrompt(systemPrompt.value)
}

function clearEngineHistory() {
  AiGateway.clearHistory('engine')
  aiExchanges.value = []
  engineHistoryTurns.value = 0
}

// Module 4: File extraction table
const extractedRows = ref<Record<string, unknown>[]>([])

async function onFileProcessed(result: ExtractedFileResult) {
  if (result.type === 'excel' && result.structured?.sheets) {
    const sheets = result.structured.sheets as Record<string, Record<string, unknown>[]>
    const firstSheet = Object.values(sheets)[0]
    if (firstSheet) {
      extractedRows.value = firstSheet
    }
  } else if (result.structured?.rows && Array.isArray(result.structured.rows)) {
    extractedRows.value = result.structured.rows as Record<string, unknown>[]
  } else {
    extractedRows.value = [{
      fileName: result.fileName,
      type: result.type,
      sizeKB: result.sizeKB,
      preview: result.extractedText?.slice(0, 200) ?? '—',
    }]
  }

  try {
    if ((result.type === 'excel' || result.type === 'csv') && result.sqlSchema && result.rowCount > 0) {
      const ctx = await LocalDataStore.loadFromExtractedResult(result)
      loadedContextBanner.value = `📁 Đã nạp bối cảnh: ${ctx.fileName} (${ctx.rowCount} dòng)`
    } else if (result.extractedText) {
      loadedContextBanner.value = `📁 Đã nạp bối cảnh: ${result.fileName}`
    }

    const contextBlock = LocalDataStore.buildAgentContextBlock(result)
    const mergedPrompt = `${baseSystemPrompt.value}${contextBlock}`
    systemPrompt.value = mergedPrompt
    AiGateway.setSystemPrompt(mergedPrompt)
  } catch (e) {
    console.error('Failed to load file into local context:', e)
    loadedContextBanner.value = null
  }
}

const extractedColumns = computed<TableColumn[]>(() => {
  if (!extractedRows.value.length) return []
  return Object.keys(extractedRows.value[0]).map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    sortable: true,
  }))
})

const sectionTitles: Record<string, string> = {
  forms: 'Forms & Data Table',
  agent: 'Agent Trace & Chat',
  ai: 'PrimeraLabs Team',
  media: 'File & Media Utilities',
}
</script>

<template>
  <DashboardLayout :title="sectionTitles[appStore.activeSection] ?? 'VAIC 2026 Showcase'">
    <!-- Module 1 -->
    <section v-show="appStore.activeSection === 'forms'" class="space-y-6">
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="card">
          <DynamicForm :schema="formSchema" @submit="onFormSubmit" />
        </div>
        <div class="card">
          <h3 class="mb-4 font-semibold text-slate-100">Data Table</h3>
          <DataTable :columns="tableColumns" :rows="tableRows" />
        </div>
      </div>
    </section>

    <!-- Module 2 -->
    <section v-show="appStore.activeSection === 'agent'" class="space-y-6">
      <div class="grid gap-6 lg:grid-cols-2">
        <AgentTraceStream :auto-connect="false" />
        <ChatAssistant
          :messages="chatMessages"
          :is-streaming="isChatStreaming"
          :context-banner="loadedContextBanner"
          @send="onChatSend"
        />
      </div>
    </section>

    <!-- Module 3 -->
    <section v-show="appStore.activeSection === 'ai'" class="space-y-6">
      <div class="card space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="font-semibold text-slate-100">AI Gateway</h3>
            <p class="text-sm text-slate-400">
              Routes inference to WebLLM (Edge) or mock Cloud API based on capability
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <SelectRoot
              :model-value="selectedModelId"
              :disabled="isInferring || isSwitchingModel || aiStore.engineState === 'loading'"
              @update:model-value="onModelChange"
            >
              <SelectTrigger class="input-base inline-flex w-44 items-center justify-between">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent class="z-50 rounded-lg border border-slate-600 bg-slate-800 p-1 shadow-xl">
                  <SelectViewport>
                    <SelectItem
                      v-for="model in LOCAL_MODELS"
                      :key="model.id"
                      :value="model.id"
                      class="cursor-pointer rounded px-3 py-2 text-sm text-slate-200 outline-none data-[highlighted]:bg-slate-700"
                    >
                      <SelectItemText>{{ model.label }}</SelectItemText>
                    </SelectItem>
                  </SelectViewport>
                </SelectContent>
              </SelectPortal>
            </SelectRoot>

            <SelectRoot :model-value="aiStore.routingMode" @update:model-value="onRoutingChange">
              <SelectTrigger class="input-base inline-flex w-40 items-center justify-between">
                <SelectValue placeholder="Routing mode" />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent class="z-50 rounded-lg border border-slate-600 bg-slate-800 p-1 shadow-xl">
                  <SelectViewport>
                    <SelectItem
                      v-for="opt in routingOptions"
                      :key="opt.value"
                      :value="opt.value"
                      class="cursor-pointer rounded px-3 py-2 text-sm text-slate-200 outline-none data-[highlighted]:bg-slate-700"
                    >
                      <SelectItemText>{{ opt.label }}</SelectItemText>
                    </SelectItem>
                  </SelectViewport>
                </SelectContent>
              </SelectPortal>
            </SelectRoot>
          </div>
        </div>

        <p v-if="selectedModel" class="text-xs text-slate-500">
          Edge model: {{ selectedModel.label }} · {{ selectedModel.hint }}
        </p>

        <Separator class="bg-slate-700" />

        <div class="space-y-2">
          <label class="text-xs font-medium text-slate-500">System prompt</label>
          <textarea
            v-model="systemPrompt"
            rows="3"
            class="input-base w-full resize-y"
            @change="onSystemPromptChange"
            @paste.capture="onSystemPromptPaste"
          />
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Conversation history: {{ engineHistoryTurns }} / 6 turns</span>
            <button
              type="button"
              class="text-blue-400 hover:text-blue-300"
              :disabled="!engineHistoryTurns && !aiExchanges.length"
              @click="clearEngineHistory"
            >
              Clear history
            </button>
          </div>
        </div>

        <Separator class="bg-slate-700" />

        <div class="flex flex-wrap gap-3">
          <button class="btn-primary" :disabled="aiStore.engineState === 'loading' || isSwitchingModel" @click="loadModel">
            <Loader2 v-if="aiStore.engineState === 'loading'" class="h-4 w-4 animate-spin" />
            <Cpu v-else class="h-4 w-4" />
            {{ isModelLoaded ? 'Reload Model' : 'Load Model' }}
          </button>
          <button
            v-if="isModelLoaded"
            class="btn-secondary"
            @click="AiGateway.terminate(); isModelLoaded = false"
          >
            Unload
          </button>
        </div>

        <div v-if="aiStore.engineState === 'loading'" class="space-y-1">
          <div class="h-2 overflow-hidden rounded-full bg-slate-700">
            <div
              class="h-full rounded-full bg-blue-500 transition-all"
              :style="{ width: `${aiStore.modelProgress}%` }"
            />
          </div>
          <p class="text-xs text-slate-500">
            Loading {{ selectedModel?.label ?? 'model' }}...
          </p>
        </div>

        <form class="flex gap-2" @submit.prevent="onAiGenerate">
          <input
            v-model="aiPrompt"
            type="text"
            class="input-base flex-1"
            placeholder="Enter a prompt or paste a formula (e.g. $x^2 - 5x + 6 = 0$)..."
            :disabled="isInferring"
            @paste.capture="onAiPromptPaste"
          />
          <button type="submit" class="btn-primary" :disabled="!aiPrompt.trim() || isInferring">
            <Loader2 v-if="isInferring" class="h-4 w-4 animate-spin" />
            Generate
          </button>
        </form>

        <div v-if="aiExchanges.length" class="space-y-4">
          <div v-for="ex in aiExchanges" :key="ex.id" class="space-y-2">
            <p class="text-xs font-medium text-slate-500">Prompt</p>
            <p class="text-sm text-slate-300">{{ ex.prompt }}</p>
            <p class="text-xs font-medium text-slate-500">
              Response
              <span v-if="ex.status === 'error'" class="text-red-400">(error)</span>
            </p>
            <div class="rounded-lg bg-slate-800 p-4 text-sm text-slate-300">
              <MarkdownContent
                :content="ex.response"
                :is-streaming="ex.status === 'streaming'"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Module 4 -->
    <section v-show="appStore.activeSection === 'media'" class="space-y-6">
      <TabsRoot default-value="camera" class="space-y-4">
        <TabsList class="inline-flex rounded-lg bg-slate-800 p-1">
          <TabsTrigger
            value="camera"
            class="rounded-md px-4 py-2 text-sm font-medium text-slate-400 data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            Camera
          </TabsTrigger>
          <TabsTrigger
            value="files"
            class="rounded-md px-4 py-2 text-sm font-medium text-slate-400 data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera">
          <CameraCapture />
        </TabsContent>

        <TabsContent value="files" class="space-y-6">
          <FileUploader @file-processed="onFileProcessed" />
          <div v-if="extractedRows.length" class="card">
            <h3 class="mb-4 font-semibold text-slate-100">Extracted Data</h3>
            <DataTable :columns="extractedColumns" :rows="extractedRows" />
          </div>
        </TabsContent>
      </TabsRoot>
    </section>
  </DashboardLayout>
</template>
