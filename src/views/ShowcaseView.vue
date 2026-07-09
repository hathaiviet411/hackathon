<script setup lang="ts">
import { ref, computed } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import DynamicForm from '@/components/forms/DynamicForm.vue'
import DataTable from '@/components/data/DataTable.vue'
import AgentTraceStream from '@/components/agent/AgentTraceStream.vue'
import ChatAssistant from '@/components/chat/ChatAssistant.vue'
import CameraCapture from '@/components/media/CameraCapture.vue'
import FileUploader from '@/components/media/FileUploader.vue'
import { AiGateway } from '@/services/AiGateway'
import { useAppStore } from '@/stores/app'
import { useAiEngineStore } from '@/stores/aiEngine'
import type { ChatMessage, ExtractedFileResult, FormSchema, TableColumn } from '@/types'
import formSchemaJson from '@/schemas/formSchema.example.json'

const formSchema = formSchemaJson as FormSchema
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
const streamingContent = ref('')
const isChatStreaming = ref(false)

function onChatSend(message: string) {
  chatMessages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: message,
  })
  runAiInference(message)
}

// Module 3: AI Engine
const aiPrompt = ref('')
const isModelLoaded = ref(false)
const isInferring = ref(false)

const routingOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'local', label: 'Local (Edge)' },
  { value: 'cloud', label: 'Cloud' },
]

async function loadModel() {
  try {
    await AiGateway.init({ mode: aiStore.routingMode })
    isModelLoaded.value = true
  } catch (e) {
    console.error('Model load failed:', e)
  }
}

async function runAiInference(prompt: string) {
  if (!isModelLoaded.value) {
    await loadModel()
  }

  isInferring.value = true
  isChatStreaming.value = true
  streamingContent.value = ''

  await AiGateway.generate(
    prompt,
    {
      onToken: (token) => {
        streamingContent.value += token
      },
      onDone: () => {
        if (streamingContent.value) {
          chatMessages.value.push({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: streamingContent.value,
          })
        }
        streamingContent.value = ''
        isChatStreaming.value = false
        isInferring.value = false
      },
      onError: () => {
        isChatStreaming.value = false
        isInferring.value = false
      },
    },
    aiStore.routingMode,
  )
}

async function onAiGenerate() {
  if (!aiPrompt.value.trim()) return
  const prompt = aiPrompt.value
  aiPrompt.value = ''
  await runAiInference(prompt)
}

function onRoutingChange(value: string) {
  aiStore.setRoutingMode(value as 'auto' | 'local' | 'cloud')
}

// Module 4: File extraction table
const extractedRows = ref<Record<string, unknown>[]>([])

function onFileProcessed(result: ExtractedFileResult) {
  if (result.type === 'excel' && result.structured?.sheets) {
    const sheets = result.structured.sheets as Record<string, Record<string, unknown>[]>
    const firstSheet = Object.values(sheets)[0]
    if (firstSheet) {
      extractedRows.value = firstSheet
      return
    }
  }
  extractedRows.value = [{
    fileName: result.fileName,
    type: result.type,
    sizeKB: result.sizeKB,
    preview: result.text?.slice(0, 200) ?? '—',
  }]
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
  ai: 'AI On-Edge Engine',
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
          :streaming-content="streamingContent"
          :is-streaming="isChatStreaming"
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

        <Separator class="bg-slate-700" />

        <div class="flex flex-wrap gap-3">
          <button class="btn-primary" :disabled="aiStore.engineState === 'loading'" @click="loadModel">
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
          <p class="text-xs text-slate-500">Loading Llama-3.2-1B-Instruct...</p>
        </div>

        <form class="flex gap-2" @submit.prevent="onAiGenerate">
          <input
            v-model="aiPrompt"
            type="text"
            class="input-base flex-1"
            placeholder="Enter a prompt to test inference..."
            :disabled="isInferring"
          />
          <button type="submit" class="btn-primary" :disabled="!aiPrompt.trim() || isInferring">
            <Loader2 v-if="isInferring" class="h-4 w-4 animate-spin" />
            Generate
          </button>
        </form>

        <div v-if="streamingContent" class="rounded-lg bg-slate-800 p-4 text-sm text-slate-300">
          {{ streamingContent }}<span class="animate-pulse">▌</span>
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
