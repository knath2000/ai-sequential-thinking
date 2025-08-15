<script lang="ts">
  export let title: string
  export let value: string | number | null | undefined
</script>

<div class="glass rounded-xl p-4">
  <div class="text-sm text-gray-400">{title}</div>
  <div class="mt-1 text-3xl font-semibold">{value ?? '–'}</div>
  
</div>


