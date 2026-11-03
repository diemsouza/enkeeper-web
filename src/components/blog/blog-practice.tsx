"use client";

import { MessageBubble } from "@/src/components/chat/message-bubble";
import {
  buildPracticeQuestionMessage,
  buildPracticeTurnMessages,
} from "@/src/components/chat/practice-turn";
import type { Message } from "@/src/components/chat/types";
import { BLOG_PRACTICE_EXAMPLES } from "@/src/content/blog/practice-examples";

// Conversa de exemplo com os baloes reais do chat, sem composer.
export function BlogPractice({ slug }: { slug: string }) {
  const example = BLOG_PRACTICE_EXAMPLES[slug];
  if (!example) return null;

  const { question, questionTime, level: _level, options, image, ...turn } = example;
  const messages: Message[] = [
    buildPracticeQuestionMessage({
      id: `${slug}-q`,
      time: questionTime,
      text: question,
      options,
      selectedOption: turn.userAnswer,
      image,
    }),
    ...buildPracticeTurnMessages({ idPrefix: slug, ...turn }),
  ];

  return (
    <div
      data-chat-density="compact"
      className="not-prose my-8 rounded-panel border border-border bg-[#F5F5F7] p-4 dark:bg-[#1C1C1E]"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            fluidAudio
            zoomDisabled
          />
        ))}
      </div>
    </div>
  );
}
