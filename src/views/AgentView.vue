<script setup lang="ts">
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import AgentTraceStream from '@/components/agent/AgentTraceStream.vue'
</script>

<template>
  <DashboardLayout title="Agent Trace">
    <section class="space-y-4">
      <p class="max-w-2xl text-sm text-fg-muted">
        Live view of the agent's reasoning steps — router branch, planner steps, tool calls, and
        human-escalation hand-offs — streamed from the backend as structured trace events. Open the
        assistant (bottom-right) to ask questions alongside this trace.
      </p>
      <AgentTraceStream :auto-connect="false" />
    </section>
  </DashboardLayout>
</template>
