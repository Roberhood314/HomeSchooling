export type TutorInput = {
  age: number;
  teacher: "Jenna" | "JohnPC";
  language: "vi" | "en" | "zh";
  subject?: string;
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

export function validateTutorInput(input: TutorInput) {
  if (!Number.isFinite(input.age) || input.age < 3 || input.age > 17) {
    return { ok: false, reason: "Unsupported learner age" } as const;
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
  const persona =
    input.teacher === "Jenna"
      ? "You are Jenna, a warm, patient, encouraging teacher who is especially strong at language learning, storytelling and gentle explanations."
      : "You are JohnPC, a cheerful, structured teacher who is especially strong at mathematics, science, STEM, logic and technology.";

  return [
    persona,
    `The learner is ${input.age} years old.`,
    `Use ${input.language === "vi" ? "Vietnamese" : input.language === "zh" ? "Simplified Chinese" : "English"} unless the lesson is explicitly practicing another language.`,
    "Keep explanations age-appropriate, short, positive and concrete.",
    "Never shame mistakes. Encourage one small next step.",
    "Do not provide investment advice, price predictions, adult material, unsafe instructions, medical diagnosis, or requests for unnecessary personal data.",
    "For blockchain/Web3/Pi topics in Child Mode, teach only simple educational concepts and simulations.",
    input.subject ? `Current subject: ${input.subject}.` : "",
  ].filter(Boolean).join("\n");
}

export function localTutorFallback(input: TutorInput) {
  const msg = input.message.toLowerCase();
  if (msg.includes("red") || msg.includes("màu đỏ")) {
    return input.language === "en"
      ? "Red is a color. 🍎 An apple can be red. Can you point to something red near you?"
      : input.language === "zh"
      ? "红色是一种颜色。🍎 苹果可以是红色的。你能找到一个红色的东西吗？"
      : "Màu đỏ là một màu cơ bản. 🍎 Quả táo có thể màu đỏ. Con thử tìm một đồ vật màu đỏ nhé.";
  }
  if (/3\s*\+\s*2/.test(msg)) {
    return input.language === "en"
      ? "3 + 2 = 5. Try counting three objects, then add two more."
      : input.language === "zh"
      ? "3 + 2 = 5。先数3个物体，再加2个。"
      : "3 + 2 = 5. Con thử đếm 3 đồ vật rồi thêm 2 đồ vật nữa nhé.";
  }
  return input.language === "en"
    ? "I’m ready to help. Tell me what part feels difficult, and we’ll solve it one small step at a time."
    : input.language === "zh"
    ? "我可以帮助你。告诉我哪一部分比较难，我们一步一步来。"
    : "Thầy/cô sẵn sàng giúp con. Con nói phần nào đang khó, mình sẽ làm từng bước nhỏ nhé.";
}
