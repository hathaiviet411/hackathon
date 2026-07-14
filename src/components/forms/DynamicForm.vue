<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { FormSchema } from '@/types'
import FieldRenderer from './fields/FieldRenderer.vue'

const props = defineProps<{
  schema: FormSchema
}>()

const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
}>()

const formData = reactive<Record<string, unknown>>({})
const errors = reactive<Record<string, string>>({})

props.schema.fields.forEach((field) => {
  formData[field.name] = field.type === 'checkbox' ? false : ''
})

function validate(): boolean {
  let valid = true
  Object.keys(errors).forEach((k) => delete errors[k])

  for (const field of props.schema.fields) {
    const value = formData[field.name]

    if (field.required) {
      if (value === '' || value === null || value === undefined) {
        errors[field.name] = 'This field is required'
        valid = false
        continue
      }
    }

    if (field.type === 'text' || field.type === 'textarea') {
      const str = String(value ?? '')
      if (field.validation?.minLength && str.length < field.validation.minLength) {
        errors[field.name] = `Minimum ${field.validation.minLength} characters`
        valid = false
      }
      if (field.validation?.maxLength && str.length > field.validation.maxLength) {
        errors[field.name] = `Maximum ${field.validation.maxLength} characters`
        valid = false
      }
      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern)
        if (!regex.test(str)) {
          errors[field.name] = 'Invalid format'
          valid = false
        }
      }
    }

    if (field.type === 'number' && value !== '' && value !== null) {
      const num = Number(value)
      if (field.validation?.min !== undefined && num < field.validation.min) {
        errors[field.name] = `Minimum value is ${field.validation.min}`
        valid = false
      }
      if (field.validation?.max !== undefined && num > field.validation.max) {
        errors[field.name] = `Maximum value is ${field.validation.max}`
        valid = false
      }
    }
  }

  return valid
}

function handleSubmit() {
  if (!validate()) return
  emit('submit', { ...formData })
}

const isValid = computed(() => Object.keys(errors).length === 0)
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div v-if="schema.title" class="mb-2">
      <h3 class="text-base font-semibold text-fg">{{ schema.title }}</h3>
      <p v-if="schema.description" class="mt-1 text-sm text-fg-muted">{{ schema.description }}</p>
    </div>

    <FieldRenderer
      v-for="field in schema.fields"
      :key="field.name"
      :field="field"
      v-model="formData[field.name]"
      :error="errors[field.name]"
    />

    <button type="submit" class="btn-primary w-full sm:w-auto" :disabled="!isValid">
      Submit
    </button>
  </form>
</template>
