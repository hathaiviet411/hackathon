<script setup lang="ts">
import { computed } from 'vue'
import type { FormField } from '@/types'

const props = defineProps<{
  field: FormField
  modelValue: unknown
  error?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
}>()

const textValue = computed({
  get: () => String(props.modelValue ?? ''),
  set: (v: string) => emit('update:modelValue', v),
})

const numberValue = computed({
  get: () => Number(props.modelValue ?? 0),
  set: (v: number) => emit('update:modelValue', v),
})

const boolValue = computed({
  get: () => Boolean(props.modelValue),
  set: (v: boolean) => emit('update:modelValue', v),
})
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="field.type !== 'checkbox'" :for="field.name" class="block text-sm font-medium text-slate-300">
      {{ field.label }}
      <span v-if="field.required" class="text-red-400">*</span>
    </label>

    <input
      v-if="field.type === 'text'"
      :id="field.name"
      v-model="textValue"
      type="text"
      class="input-base"
      :placeholder="field.placeholder"
    />

    <input
      v-else-if="field.type === 'number'"
      :id="field.name"
      v-model.number="numberValue"
      type="number"
      class="input-base"
      :placeholder="field.placeholder"
    />

    <input
      v-else-if="field.type === 'date'"
      :id="field.name"
      v-model="textValue"
      type="date"
      class="input-base"
    />

    <textarea
      v-else-if="field.type === 'textarea'"
      :id="field.name"
      v-model="textValue"
      class="input-base min-h-[80px] resize-y"
      :placeholder="field.placeholder"
    />

    <select
      v-else-if="field.type === 'select'"
      :id="field.name"
      v-model="textValue"
      class="input-base"
    >
      <option value="" disabled>Select...</option>
      <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>

    <label v-else-if="field.type === 'checkbox'" :for="field.name" class="flex items-center gap-2 cursor-pointer">
      <input
        :id="field.name"
        v-model="boolValue"
        type="checkbox"
        class="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
      />
      <span class="text-sm text-slate-300">{{ field.label }}</span>
    </label>

    <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
  </div>
</template>
