export interface PracticeTopic {
  id: string;
  topic: string;
  problemCount: number;
}

export interface PracticeProblem {
  id: string;
  topicId: string;
  problemNumber?: number;
  question: string;
  answer: string;
  tags: string[];
  questionImage?: string;
  answerImage?: string;
}
