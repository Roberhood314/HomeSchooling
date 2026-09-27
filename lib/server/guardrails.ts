export type TutorInput = {
  age: number;
  teacher: "Jenna" | "JohnPC";
  language: "vi" | "en" | "zh";
  subject?: string;
  lessonTitle?: string;
  objective?: string;
  skillFocus?: string[];
  mastery?: Record<string, number>;
  message: string;
};

const blockedPatterns = [
  /investment advice/i,
  /buy\s+(pi|crypto|token)/i,
  /price prediction/i,
  /adult content/i,
  /weapon/i,
  /self[- ]harm/i,
];

function stageForAge(age:number) {
  if (age === 3) return { stage:"Little Explorer", style:"play-based, concrete, 1-step prompts", maxWords:45, pace:"very short turns" };
  if (age === 4) return { stage:"Young Learner", style:"play-based with 2-step prompts", maxWords:60, pace:"short turns" };
  if (age === 5) return { stage:"Kindergarten Ready", style:"guided play + school readiness", maxWords:80, pace:"short guided turns" };
  if (age === 6) return { stage:"Primary Starter", style:"guided mastery with examples", maxWords:110, pace:"one concept at a time" };
  if (age === 7) return { stage:"Foundation Builder", style:"guided mastery + reasoning", maxWords:140, pace:"explain then practice" };
  if (age === 8) return { stage:"Primary Explorer", style:"project-based guided independence", maxWords:170, pace:"reason, apply, reflect" };
  return { stage:"Independent Learner", style:"structured independent learning", maxWords:200, pace:"evidence, reasoning, reflection" };
}

export function validateTutorInput(input: TutorInput) {
  if (!Number.isFinite(input.age) || input.age < 3 || input.age > 9) {
    return { ok: false, reason: "AI HomeSchool Child Mode supports ages 3-9." } as const;
  }
  if (!input.message?.trim() || input.message.length > 2000) {
    return { ok: false, reason: "Invalid message" } as const;
  }
  if (blockedPatterns.some((r) => r.test(input.message))) {
    return { ok: false, reason: "This topic belongs in Parent/Explorer mode." } as const;
  }
  return { ok: true } as const;
}

export function teacherSystemPrompt(input: TutorInput) {
  const stage = stageForAge(input.age);
  const persona = input.teacher === "Jenna"
    ? "You are Jenna AI, the language-and-learning mentor. You are warm, patient, expressive, excellent at phonics, vocabulary, storytelling, speaking practice, reading comprehension, creativity and emotional encouragement."
    : "You are JohnPC AI, the STEM-and-reasoning mentor. You are cheerful, precise, structured, excellent at mathematics, science, STEM, coding concepts, logic, experiments and step-by-step problem solving.";

  const mastery = input.mastery && Object.keys(input.mastery).length
    ? "Current mastery snapshot: " + JSON.stringify(input.mastery) + ". Reinforce weak skills and do not accelerate skills below 0.65 mastery."
    : "No mastery snapshot was supplied. Use the current lesson and the learner's age as the primary guide.";

  return [
    persona,
    `Learner age: ${input.age}. Developmental stage: ${stage.stage}.`,
    `Teaching style: ${stage.style}; pace: ${stage.pace}.`,
    `Keep a normal response under about ${stage.maxWords} words unless the parent asks for detail.`,
    `Default language: ${input.language === "vi" ? "Vietnamese" : input.language === "zh" ? "Simplified Chinese" : "English"}.`,
    input.subject ? `Current subject: ${input.subject}.` : "",
    input.lessonTitle ? `Current lesson: ${input.lessonTitle}.` : "",
    input.objective ? `Lesson objective: ${input.objective}.` : "",
    input.skillFocus?.length ? `Skill focus: ${input.skillFocus.join(", ")}.` : "",
    mastery,
    "Stay on the current learning pathway unless the child explicitly asks a closely related question.",
    "Use active recall: ask one small question after explaining.",
    "When the child is wrong, acknowledge effort, give a hint, then let the child try again before revealing the full answer.",
    "For ages 3-5, prefer objects, pictures, movement, songs, matching, pointing and one-step tasks. Avoid abstract lectures.",
    "For ages 6-7, use worked examples, short practice and immediate feedback.",
    "For ages 8-9, ask for reasoning, evidence, comparison and small projects.",
    "Never shame mistakes, request unnecessary personal information, provide investment advice, price predictions, adult material, unsafe instructions, or medical diagnosis.",
    "Blockchain/Web3/Pi content in Child Mode is educational simulation only, with no real-money transaction guidance.",
  ].filter(Boolean).join("\n");
}

export function localTutorFallback(input: TutorInput) {
  const msg = input.message.toLowerCase();
  const stage = stageForAge(input.age);

  if (msg.includes("red") || msg.includes("màu đỏ")) {
    return input.language === "en"
      ? "Red is a color. 🍎 An apple can be red. Can you point to one red thing near you?"
      : input.language === "zh"
      ? "红色是一种颜色。🍎 苹果可以是红色的。你能找到一个红色的东西吗？"
      : "Màu đỏ là một màu cơ bản. 🍎 Quả táo có thể màu đỏ. Con thử chỉ một đồ vật màu đỏ nhé.";
  }
  if (/3\s*\+\s*2/.test(msg)) {
    return input.age <= 5
      ? "Mình lấy 3 đồ vật, rồi thêm 2 đồ vật nữa. Cùng đếm: 1, 2, 3, 4, 5. Vậy 3 + 2 = 5. Con thử lại nhé?"
      : "3 + 2 = 5. Hãy tưởng tượng 3 khối, thêm 2 khối. Con có thể giải thích vì sao được 5 không?";
  }

  const topic = input.lessonTitle || input.subject || "bài học hiện tại";
  return input.language === "en"
    ? `We are learning ${topic}. I’ll help in a ${stage.style} way. Tell me the exact part that feels difficult, then try one small step.`
    : input.language === "zh"
    ? `我们正在学习“${topic}”。我会按照适合你年龄的方式一步一步帮助你。告诉我哪一部分最难。`
    : `Mình đang học “${topic}”. Thầy/cô sẽ hướng dẫn theo đúng lứa tuổi, từng bước nhỏ. Con nói phần nào khó nhất nhé.`;
}
