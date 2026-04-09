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

    it("should return null when questions field is missing", () => {
      const invalidJson = JSON.stringify({});
      expect(parseRubricJson(invalidJson)).toBeNull();
    });

    it("should return null when max_score is a string", () => {
      const invalidJson = JSON.stringify({
        questions: [
          {
            question_id: "q1",
            question_name: "Question 1",
            rubric_items: [
              { criterion: "Criterion 1", rubric_name: "Rubric 1", max_score: "10" },
            ],
          },
        ],
      });
      expect(parseRubricJson(invalidJson)).toBeNull();
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

    it("should flatten items across multiple questions with correct ordering", () => {
      const rubric = {
        questions: [
          {
            question_id: "q1",
            question_name: "Question 1",
            rubric_items: [{ criterion: "C1", rubric_name: "R1", max_score: 2 }],
          },
          {
            question_id: "q2",
            question_name: "Question 2",
            rubric_items: [
              { criterion: "C2", rubric_name: "R2", max_score: 3 },
              { criterion: "C3", rubric_name: "R3", max_score: 4 },
            ],
          },
        ],
      };

      expect(flattenRubricItems(rubric)).toEqual([
        {
          criterion: "C1",
          rubric_name: "R1",
          max_score: 2,
          question_id: "q1",
          question_name: "Question 1",
          order: 0,
          question_order: 0,
          item_order: 0,
        },
        {
          criterion: "C2",
          rubric_name: "R2",
          max_score: 3,
          question_id: "q2",
          question_name: "Question 2",
          order: 1,
          question_order: 1,
          item_order: 0,
        },
        {
          criterion: "C3",
          rubric_name: "R3",
          max_score: 4,
          question_id: "q2",
          question_name: "Question 2",
          order: 2,
          question_order: 1,
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

    it("should return 0 item count for an empty rubric", () => {
      expect(getRubricItemCount({ questions: [] })).toBe(0);
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

    it("should include rubric items with max_score 0 in total score", () => {
      const rubric = {
        questions: [
          {
            question_id: "q1",
            question_name: "Question 1",
            rubric_items: [
              { criterion: "C1", rubric_name: "R1", max_score: 0 },
              { criterion: "C2", rubric_name: "R2", max_score: 5 },
            ],
          },
        ],
      };

      expect(getRubricTotalMaxScore(rubric)).toBe(5);
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

    it("should collect multiple messages for the same field path", () => {
      const error = new z.ZodError([
        {
          path: ["questions", 0, "rubric_items", 0, "criterion"],
          message: "Criterion is required",
          code: "custom",
        },
        {
          path: ["questions", 0, "rubric_items", 0, "criterion"],
          message: "Criterion must be at least 3 characters",
          code: "custom",
        },
      ]);

      expect(buildRubricFieldErrors(error)).toEqual({
        "questions.0.rubric_items.0.criterion": [
          "Criterion is required",
          "Criterion must be at least 3 characters",
        ],
      });
    });
  });
});