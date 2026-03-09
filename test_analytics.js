async function test() {
  const res = await fetch('http://localhost:3000/api/search/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      raw_prompt: "test",
      extracted_needs_json: { need_types: ["test"] },
      inferred_location: "test",
      inferred_urgency: "test",
      inferred_need_types: ["test"],
      results_count: 1,
      matched_resource_ids: ["test"],
      search_success: true,
      session_id: "test"
    })
  });
  console.log(res.status);
  console.log(await res.text());
}

test();
