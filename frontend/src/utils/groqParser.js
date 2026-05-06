export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = "";
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(" ");
    fullText += pageText + "\n";
  }
  
  return fullText;
}

export async function parseResumeWithGroq(text) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  
  if (!apiKey || apiKey === 'gsk_your_groq_api_key_here') {
    throw new Error("GROQ API key not configured. Add VITE_GROQ_API_KEY to your .env file.");
  }

  const systemPrompt = "You are a resume parser. Return ONLY valid JSON, no markdown, no code blocks. Structure: { name, cgpa, cgpa_scale, skills: [], urls: [{label, url}], achievements: [], github_username }. Detect github_username from any GitHub URL found.";
  
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this resume:\n\n${text}` }
      ],
      temperature: 0
    })
  });
  
  if (!response.ok) {
    throw new Error("Failed to parse resume with Groq");
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content.trim();
  const cleanedContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
  
  return JSON.parse(cleanedContent);
}
