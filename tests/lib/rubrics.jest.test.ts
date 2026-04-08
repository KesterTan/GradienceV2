import { z } from "zod";
import {
  parseRubricJson,
  flattenRubricItems,
  getRubricItemCount,
  getRubricTotalMaxScore,
  buildRubricFieldErrors,
} from "../../lib/rubrics";

describe("rubrics.ts", () => {
  describe("parseRubricJson", () => {
    it("should parse valid JSON strings into RubricPayload", () => {
      const validJson = JSON.stringify({
        questions: [
          {
            question_id: "q1",
            question_name: "Question 1",
            rubric_items: [
              { criterion: "Criterion 1", rubric_name: "Rubric 1", max_score: 10 },
            ],
          },
        ],
      });

      const result = parseRubricJson(validJson);
      expect(result).toEqual({
        questions: [
          {
            question_id: "q1",
            question_name: "Question 1",
            rubric_items: [
              { criterion: "Criterion 1", rubric_name: "Rubric 1", max_score: 10 },
            ],
          },
        ],
      });
    });

    it("should return null for invalid JSON strings", () => {
      const invalidJson = "{ invalid: true }";
      const result = parseRubricJson(invalidJson);
      expect(result).toBeNull();
    });

    it("should return null for schema violations", () => {
      const invalidSchema = JSON.stringify({
        questions: [
          {
            question_id: "q1",
            question_name: "Question 1",
            rubric_items: [], // Empty rubric_items violates schema
          },
        ],
      });

      const result = parseRubricJson(invalidSchema);
      expect(result).toBeNull();
    });
  });

  describe("flattenRubricItems", () => {
    it("should flatten nested rubric items into a flat array", () => {
      const rubric = {
        questions: [
          {
            question_id: "q1",
            question_name: "Question 1",
            rubric_items: [
              { criterion: "Criterion 1", rubric_name: "Rubric 1", max_score: 10 },
              { criterion: "Criterion 2", rubric_name: "Rubric 2", max_score: 5 },
            ],
          },
        ],
      };

      const result = flattenRubricItems(rubric);
      expect(result).toEqual([
        {
          criterion: "Criterion 1",
          rubric_name: "Rubric 1",
          max_score: 10,
          question_id: "q1",
          question_name: "Question 1",
          order: 0,
          question_order: 0,
          item_order: 0,
        },
        {
          criterion: "Criterion 2",
          rubric_name: "Rubric 2",
          max_score: 5,
          question_id: "q1",
          question_name: "Question 1",
          order: 1,
          question_order: 0,
          item_order: 1,
        },
      ]);
    });
  });

  describe("getRubricItemCount", () => {
    it("should return the total number of rubric items", () => {
      const rubric = {
        questions: [
          {
            question_id: "q1",
            question_name: "Question 1",
            rubric_items: [
              { criterion: "Criterion 1", rubric_name: "Rubric 1", max_score: 10 },
              { criterion: "Criterion 2", rubric_name: "Rubric 2", max_score: 5 },
            ],
          },
        ],
      };

      const result = getRubricItemCount(rubric);
      expect(result).toBe(2);
    });
  });

  describe("getRubricTotalMaxScore", () => {
    it("should return the total maximum score for a rubric", () => {
      const rubric = {
        questions: [
          {
            question_id: "q1",
            question_name: "Question 1",
            rubric_items: [
              { criterion: "Criterion 1", rubric_name: "Rubric 1", max_score: 10 },
              { criterion: "Criterion 2", rubric_name: "Rubric 2", max_score: 5 },
            ],
          },
        ],
      };

      const result = getRubricTotalMaxScore(rubric);
      expect(result).toBe(15);
    });
  });

  describe("buildRubricFieldErrors", () => {
    it("should construct error messages for invalid rubric fields", () => {
      const error = new z.ZodError([
        {
          path: ["questions", 0, "rubric_items", 0, "criterion"],
          message: "Criterion is required",
          code: "custom",
        },
        {
          path: ["questions", 0, "rubric_items", 0, "rubric_name"],
          message: "Rubric name is required",
          code: "custom",
        },
      ]);

      const result = buildRubricFieldErrors(error);
      expect(result).toEqual({
        "questions.0.rubric_items.0.criterion": ["Criterion is required"],
        "questions.0.rubric_items.0.rubric_name": ["Rubric name is required"],
      });
    });
  });
});