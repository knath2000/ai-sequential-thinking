// Simple polling script for /modal/job/:id
// Usage: node scripts/poll_job_result.js <job_id>

const axios = require('axios');

async function main() {
  const jobId = process.argv[2];
  const base = process.env.PUBLIC_BASE_URL;
  if (!jobId || !base) {
    console.error('Usage: PUBLIC_BASE_URL=<url> node scripts/poll_job_result.js <job_id>');
    process.exit(1);
  }
  const url = new URL(`/modal/job/${jobId}`, base).toString();
  console.log(`[poll] polling ${url}`);
  for (;;) {
    try {
      const { data } = await axios.get(url, { timeout: 5000 });
      if (data && data.done) {
        console.log('[poll] done, result:');
        console.log(JSON.stringify(data.result, null, 2));
        process.exit(0);
      }
      console.log('[poll] not done yet, retrying in 5s');
    } catch (e) {
      console.error('[poll] error', e?.message || e);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
