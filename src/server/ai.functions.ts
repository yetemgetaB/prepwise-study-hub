import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface AIArgs {
  kind: "plan" | "schedule" | "curriculum";
  input: string;
}

const taskTool = {
  type: "function" as const,
  function: {
    name: "create_study_plan",
    description: "Return a structured study plan with tasks and subtasks.",
    parameters: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              suggestedMinutes: { type: "number" },
              subtasks: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["title", "priority", "suggestedMinutes", "subtasks"],
            additionalProperties: false,
          },
        },
      },
      required: ["tasks"],
      additionalProperties: false,
    },
  },
};

const scheduleTool = {
  type: "function" as const,
  function: {
    name: "create_schedule",
    description: "Parse text into weekly class schedule entries.",
    parameters: {
      type: "object",
      properties: {
        entries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "string", enum: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] },
              startPeriod: { type: "number", description: "1=08:00, each period is 1 hour" },
              duration: { type: "number", description: "Number of consecutive periods" },
              className: { type: "string" },
              instructor: { type: "string" },
              room: { type: "string" },
            },
            required: ["day","startPeriod","duration","className"],
            additionalProperties: false,
          },
        },
      },
      required: ["entries"],
      additionalProperties: false,
    },
  },
};

const curriculumTool = {
  type: "function" as const,
  function: {
    name: "create_curriculum",
    description: "Parse text into a list of courses.",
    parameters: {
      type: "object",
      properties: {
        courses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              code: { type: "string" },
              credits: { type: "number" },
              instructor: { type: "string" },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
      },
      required: ["courses"],
      additionalProperties: false,
    },
  },
};

export const aiAssist = createServerFn({ method: "POST" })
  .inputValidator((data: AIArgs) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI gateway not configured (LOVABLE_API_KEY missing)." };
    }

    const tool =
      data.kind === "plan" ? taskTool :
      data.kind === "schedule" ? scheduleTool : curriculumTool;
    const toolName = tool.function.name;

    const systemPrompt =
      data.kind === "plan"
        ? "You are an expert university study planner. Convert the user's intent into 2-6 actionable tasks with realistic time estimates and 1-4 subtasks each. Be specific."
        : data.kind === "schedule"
          ? "You are parsing a university class schedule. Use period 1 = 08:00, period 2 = 09:00, etc. Identify day, startPeriod, duration (hours), className, instructor and room when present."
          : "You are parsing a university curriculum or course list. Extract each distinct course with its code, credits and instructor when available.";

    try {
      const resp = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: data.input },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: toolName } },
        }),
      });

      if (resp.status === 429) {
        return { ok: false as const, error: "Rate limit reached. Please wait a moment and try again." };
      }
      if (resp.status === 402) {
        return { ok: false as const, error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." };
      }
      if (!resp.ok) {
        const t = await resp.text();
        console.error("AI gateway error", resp.status, t);
        return { ok: false as const, error: `AI request failed (${resp.status}).` };
      }
      const json = await resp.json();
      const call = json.choices?.[0]?.message?.tool_calls?.[0];
      if (!call) {
        return { ok: false as const, error: "AI returned no structured output." };
      }
      const parsed = JSON.parse(call.function.arguments);
      return { ok: true as const, data: parsed };
    } catch (e) {
      console.error("AI call failed", e);
      return { ok: false as const, error: e instanceof Error ? e.message : "Unknown AI error." };
    }
  });
