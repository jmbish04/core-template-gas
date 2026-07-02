import type {AiToolDefinition} from '@shared/ai/Types';
import {SlidesService} from '@shared/workspace/SlidesService';

/**
 * Tool definition for creating Google Slides decks from structured outline data.
 */
export const createSlidesPresentationTool: AiToolDefinition = {
  name: 'slides_create_presentation',
  description: 'Create a Google Slides presentation from a title and structured slide outline.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {type: 'string', description: 'Presentation title.'},
      slides: {type: 'array', description: 'Array of slide specs containing title, bullets, and optional notes.', items: {type: 'object', description: 'Slide specification.'}}
    },
    required: ['title', 'slides']
  },
  execute: (args) =>
    SlidesService.createPresentationFromOutline(
      String(args.title),
      Array.isArray(args.slides) ? (args.slides as never[]) : []
    )
};
