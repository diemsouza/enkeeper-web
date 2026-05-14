export type FormatLevel = {
  question: string;
  feedback: {
    right: string;
    wrong: string;
    partial?: string;
  };
};

export type QuestionFormatData = {
  format: string;
  question_info?: string;
  feedback_info?: string;
  levels: {
    basic: FormatLevel;
    intermediate: FormatLevel;
    advanced: FormatLevel;
  };
};
