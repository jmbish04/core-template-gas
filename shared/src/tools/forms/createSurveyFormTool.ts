import type {AiToolDefinition} from '@shared/ai/Types';
import {FormsService} from '@shared/workspace/FormsService';

/**
 * Tool definition for generating a Google Forms survey.
 */
export const createSurveyFormTool: AiToolDefinition = {
  name: 'forms_create_survey',
  description: 'Create a survey in Google Forms from structured question definitions.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {type: 'string', description: 'Survey title.'},
      questions: {type: 'array', description: 'Array of survey question specs.', items: {type: 'object', description: 'Survey question specification.'}}
    },
    required: ['title', 'questions']
  },
  execute: (args) => FormsService.createSurvey(String(args.title), Array.isArray(args.questions) ? (args.questions as never[]) : [])
};
