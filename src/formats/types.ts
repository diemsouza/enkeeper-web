export type FormatLevel = {
  question_example: string;
  feedback: {
    right: string;
    wrong: string;
    partial?: string;
  };
};

export type QuestionFormatData = {
  format: string;
  description: string;
  levels: {
    basic: FormatLevel;
    intermediate: FormatLevel;
    advanced: FormatLevel;
  };
};
