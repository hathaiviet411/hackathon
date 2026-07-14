<script setup lang="ts">
import { ref, computed } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import MarkdownContent from '@/components/chat/MarkdownContent.vue'
import { AiGateway } from '@/services/AiGateway'
import { DEFAULT_SYSTEM_PROMPT, getModelOption, LOCAL_MODELS } from '@/config/ai'
import { toSafePromptText, usePlainTextPaste } from '@/utils/plainTextPaste'
import { useAiEngineStore } from '@/stores/aiEngine'
import { useToast } from '@/composables/useToast'
import {
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

const aiStore = useAiEngineStore()
const toast = useToast()

const aiPrompt = ref('')
const isModelLoaded = ref(false)
const isInferring = ref(false)
const aiExchanges = ref<{
  id: string
  prompt: string
  response: string
  status: 'streaming' | 'done' | 'error'
}[]>([])
const systemPrompt = ref(DEFAULT_SYSTEM_PROMPT)
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
    toast.error(e instanceof Error ? e.message : 'Model load failed')
  }
}

async function onModelChange(value: string) {
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

async function onAiGenerate() {
  const prompt = toSafePromptText(aiPrompt.value)
  if (!prompt || isInferring.value) return
  aiPrompt.value = ''

  if (!isModelLoaded.value) {
    await loadModel()
  }

  AiGateway.setSystemPrompt(systemPrompt.value)

  const exchangeIndex = aiExchanges.value.length
  aiExchanges.value.push({ id: crypto.randomUUID(), prompt, response: '', status: 'streaming' })

  isInferring.value = true

  try {
    await AiGateway.generate(
      prompt,
      {
        onToken: (token) => {
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
    const current = aiExchanges.value[exchangeIndex]
    aiExchanges.value[exchangeIndex] = {
      ...current,
      response: current.response || (e instanceof Error ? e.message : 'Inference failed'),
      status: 'error',
    }
  } finally {
    isInferring.value = false
  }
}

function onRoutingChange(value: string) {
  aiStore.setRoutingMode(value as 'auto' | 'local' | 'cloud')
}

function onSystemPromptChange() {
  AiGateway.setSystemPrompt(systemPrompt.value)
}

function clearEngineHistory() {
  AiGateway.clearHistory('engine')
  aiExchanges.value = []
  engineHistoryTurns.value = 0
}
</script>

<template>
  <DashboardLayout title="AI Engine">
    <section class="space-y-6">
      <div class="card space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="font-semibold text-fg">AI Gateway</h3>
            <p class="text-sm text-fg-muted">
              Routes inference to WebLLM (Edge) or mock Cloud API based on capability
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <SelectRoot
              :model-value="selectedModelId"
              :disabled="isInferring || isSwitchingModel || aiStore.engineState === 'loading'"
              @update:model-value="onModelChange"
            >
              <SelectTrigger class="input-base inline-flex w-44 cursor-pointer items-center justify-between">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent class="z-50 rounded-lg border border-surface-border bg-surface-elevated p-1 shadow-xl">
                  <SelectViewport>
                    <SelectItem
                      v-for="model in LOCAL_MODELS"
                      :key="model.id"
                      :value="model.id"
                      :disabled="'requiresSetup' in model && model.requiresSetup"
                      class="cursor-pointer rounded px-3 py-2 text-sm text-fg outline-none data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary-soft-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
                      :title="'requiresSetup' in model && model.requiresSetup ? model.hint : undefined"
                    >
                      <SelectItemText>{{ model.label }}</SelectItemText>
                    </SelectItem>
                  </SelectViewport>
                </SelectContent>
              </SelectPortal>
            </SelectRoot>

            <SelectRoot :model-value="aiStore.routingMode" @update:model-value="onRoutingChange">
              <SelectTrigger class="input-base inline-flex w-40 cursor-pointer items-center justify-between">
                <SelectValue placeholder="Routing mode" />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent class="z-50 rounded-lg border border-surface-border bg-surface-elevated p-1 shadow-xl">
                  <SelectViewport>
                    <SelectItem
                      v-for="opt in routingOptions"
                      :key="opt.value"
                      :value="opt.value"
                      class="cursor-pointer rounded px-3 py-2 text-sm text-fg outline-none data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary-soft-foreground"
                    >
                      <SelectItemText>{{ opt.label }}</SelectItemText>
                    </SelectItem>
                  </SelectViewport>
                </SelectContent>
              </SelectPortal>
            </SelectRoot>
          </div>
        </div>

        <p v-if="selectedModel" class="text-xs text-fg-subtle">
          Edge model: {{ selectedModel.label }} · {{ selectedModel.hint }}
        </p>

        <Separator class="bg-surface-border" />

        <div class="space-y-2">
          <label class="text-xs font-medium text-fg-subtle">System prompt</label>
          <textarea
            v-model="systemPrompt"
            rows="3"
            class="input-base w-full resize-y"
            @change="onSystemPromptChange"
            @paste.capture="onSystemPromptPaste"
          />
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
            <span>Conversation history: {{ engineHistoryTurns }} / 6 turns</span>
            <button
              type="button"
              class="cursor-pointer text-primary transition-colors hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!engineHistoryTurns && !aiExchanges.length"
              @click="clearEngineHistory"
            >
              Clear history
            </button>
          </div>
        </div>

        <Separator class="bg-surface-border" />

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
          <div class="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              class="h-full rounded-full bg-aurora bg-size-200 animate-aurora-flow transition-all"
              :style="{ width: `${aiStore.modelProgress}%` }"
            />
          </div>
          <p class="text-xs text-fg-subtle">
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
            <p class="text-xs font-medium text-fg-subtle">Prompt</p>
            <p class="text-sm text-fg-muted">{{ ex.prompt }}</p>
            <p class="text-xs font-medium text-fg-subtle">
              Response
              <span v-if="ex.status === 'error'" class="text-status-red">(error)</span>
            </p>
            <div class="rounded-lg bg-surface-muted p-4 text-sm text-fg-muted">
              <MarkdownContent
                :content="ex.response"
                :is-streaming="ex.status === 'streaming'"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  </DashboardLayout>
</template>
