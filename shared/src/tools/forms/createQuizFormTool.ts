import type {AiToolDefinition} from '@shared/ai/Types';
import {FormsService} from '@shared/workspace/FormsService';

/**
 * Tool definition for generating a Google Forms quiz.
 */
export const createQuizFormTool: AiToolDefinition = {
  name: 'forms_create_quiz',
  description: 'Create a quiz in Google Forms from structured question definitions.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {type: 'string', description: 'Quiz title.'},
      questions: {type: 'array', description: 'Array of quiz question specs.', items: {type: 'object', description: 'Quiz question specification.'}}
    },
    required: ['title', 'questions']
  },
  execute: (args) => FormsService.createQuiz(String(args.title), Array.isArray(args.questions) ? (args.questions as never[]) : [])
};
