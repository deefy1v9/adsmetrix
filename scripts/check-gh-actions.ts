async function main() {
    const res = await fetch("https://api.github.com/repos/davi368/bilula/actions/runs");
    const data = await res.json();
    const latestRun = data.workflow_runs?.[0];
    if (latestRun) {
        console.log(`Latest Run: ${latestRun.status} - ${latestRun.conclusion}`);
        console.log(`URL: ${latestRun.html_url}`);
        console.log(`Created AT: ${latestRun.created_at}`);
    } else {
        console.log("No runs found:", data);
    }
}
main().catch(console.error);
