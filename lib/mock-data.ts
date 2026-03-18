export interface RubricCriterion {
  id: string
  title: string
  maxPoints: number
  description: string
}

export interface QuestionRubric {
  id: string
  questionTitle: string
  totalPoints: number
  criteria: RubricCriterion[]
}

export interface GradingResult {
  questionId: string
  questionTitle: string
  totalPoints: number
  earnedPoints: number
  criteriaResults: {
    criterionId: string
    criterionTitle: string
    maxPoints: number
    earnedPoints: number
    feedback: string
    confidence: number
  }[]
  overallFeedback: string
  highlightedRanges: { start: number; end: number }[]
}

export interface StudentSubmission {
  id: string
  name: string
  fileName: string
  questions: {
    id: string
    title: string
    content: string
  }[]
  rubric: QuestionRubric[]
  gradingResults: GradingResult[]
}

export interface ChatMessage {
  id: string
  role: "ai" | "user"
  content: string
}

export const mockChatMessages: ChatMessage[] = [
  {
    id: "msg-1",
    role: "ai",
    content:
      "I've analyzed the submission and segmented it into distinct questions based on heading patterns and content structure. Each question was identified by its numbered prefix and thematic content.",
  },
  {
    id: "msg-2",
    role: "ai",
    content:
      "For each question, I generated a rubric based on the depth of content, use of examples, logical coherence, and alignment with standard academic expectations for the topic.",
  },
  {
    id: "msg-3",
    role: "ai",
    content:
      "The rubric criteria were weighted proportionally to the complexity expected for each question. Core conceptual understanding receives the highest weight, followed by application and clarity of expression.",
  },
]

const submissions: StudentSubmission[] = [
  {
    id: "student-a",
    name: "Student A",
    fileName: "Student_A.pdf",
    questions: [
      {
        id: "q1",
        title: "Question 1: Explain the concept of Object-Oriented Programming",
        content:
          "Object-Oriented Programming (OOP) is a programming paradigm centered around the concept of objects, which are instances of classes. A class defines the blueprint for an object, encapsulating data (attributes) and behavior (methods) into a single unit. The four main pillars of OOP are encapsulation, abstraction, inheritance, and polymorphism.\n\nEncapsulation refers to bundling data and the methods that operate on that data within a single unit, restricting direct access to some of the object's components. This is typically achieved through access modifiers such as private, protected, and public. Abstraction allows developers to hide complex implementation details and expose only the necessary interface to the user.\n\nInheritance enables a new class to inherit properties and methods from an existing class, promoting code reuse and establishing a hierarchical relationship between classes. Polymorphism allows objects of different classes to be treated as objects of a common superclass, enabling method overriding and dynamic dispatch at runtime.\n\nThese principles together provide a robust framework for organizing and structuring code in large-scale software systems, making them easier to maintain, extend, and debug.",
      },
      {
        id: "q2",
        title: "Question 2: Describe the differences between SQL and NoSQL databases",
        content:
          "SQL databases are relational database management systems that store data in structured tables with predefined schemas. They use Structured Query Language (SQL) for defining and manipulating data. Examples include PostgreSQL, MySQL, and Oracle. SQL databases enforce ACID (Atomicity, Consistency, Isolation, Durability) properties, making them ideal for applications requiring strict data integrity.\n\nNoSQL databases, on the other hand, are non-relational and can store data in various formats including document stores, key-value pairs, wide-column stores, and graph databases. Examples include MongoDB, Redis, Cassandra, and Neo4j. NoSQL databases are designed for scalability and flexibility, often sacrificing strict consistency in favor of eventual consistency.\n\nThe key differences include schema flexibility (NoSQL is schema-less), scalability (NoSQL scales horizontally more easily), query language (SQL uses standardized queries while NoSQL varies by implementation), and use cases. SQL is better for complex queries and transactions, while NoSQL excels at handling large volumes of unstructured data and high-traffic web applications.",
      },
      {
        id: "q3",
        title: "Question 3: Explain the Model-View-Controller (MVC) architecture",
        content:
          "The Model-View-Controller (MVC) architecture is a software design pattern that separates an application into three interconnected components. This separation promotes organized code, parallel development, and easier maintenance.\n\nThe Model represents the data and business logic of the application. It manages the data, logic, and rules of the application, responding to requests for information and instructions to change state. The View is responsible for displaying the data to the user. It renders the model's data in a format suitable for interaction, typically as a user interface. The Controller acts as an intermediary between the Model and View, processing user input and updating the model and view accordingly.\n\nIn a web application context, when a user sends a request, the Controller receives it, interacts with the Model to retrieve or modify data, and then selects the appropriate View to render the response. Frameworks like Ruby on Rails, Django, and ASP.NET MVC implement this pattern effectively.\n\nThe MVC pattern improves code organization by enforcing separation of concerns, making it easier to test individual components and allowing multiple developers to work on different layers simultaneously.",
      },
      {
        id: "q4",
        title: "Question 4: Discuss the importance of version control systems",
        content:
          "Version control systems (VCS) are fundamental tools in modern software development that track and manage changes to code over time. They enable collaboration among developers, maintain a complete history of modifications, and provide mechanisms for branching and merging code.\n\nGit is the most widely used distributed version control system. Unlike centralized systems like SVN, Git gives every developer a full copy of the repository, enabling offline work and faster operations. Key concepts include commits (snapshots of changes), branches (parallel lines of development), and merges (combining branches).\n\nVersion control systems are critical for several reasons: they prevent code loss by maintaining a full history, they enable parallel development through branching, they facilitate code review through pull requests, and they provide accountability by tracking who made what changes and when. Additionally, they integrate with CI/CD pipelines to automate testing and deployment.\n\nBest practices include writing meaningful commit messages, using feature branches, performing regular merges to avoid conflicts, and establishing a clear branching strategy such as Git Flow or trunk-based development.",
      },
    ],
    rubric: [],
    gradingResults: [],
  },
  {
    id: "student-b",
    name: "Student B",
    fileName: "Student_B.pdf",
    questions: [
      {
        id: "q1",
        title: "Question 1: Explain the concept of Object-Oriented Programming",
        content:
          "Object-Oriented Programming is a way of writing code using objects and classes. Objects have properties and methods. Classes are like templates. You can create multiple objects from one class.\n\nThe main ideas are encapsulation and inheritance. Encapsulation means keeping data private inside objects. Inheritance means one class can extend another class to get its features.\n\nOOP is used in many languages like Java, Python, and C++. It helps organize code better than procedural programming because everything is grouped into objects.",
      },
      {
        id: "q2",
        title: "Question 2: Describe the differences between SQL and NoSQL databases",
        content:
          "SQL databases use tables to store data. They have rows and columns. You write SQL queries to get data out. MySQL and PostgreSQL are SQL databases.\n\nNoSQL databases don't use tables. They can use documents, key-value pairs, or graphs. MongoDB is a popular NoSQL database.\n\nSQL is better when you need structured data with relationships between tables. NoSQL is better for big data and when the data structure might change a lot. Both types have their own advantages and are used in different situations.",
      },
      {
        id: "q3",
        title: "Question 3: Explain the Model-View-Controller (MVC) architecture",
        content:
          "MVC stands for Model-View-Controller. It is a design pattern used in web development. The Model handles the data, the View handles what the user sees, and the Controller handles the logic between them.\n\nWhen a user clicks a button, the Controller processes the request, gets data from the Model, and sends it to the View to display. This separation makes the code cleaner and easier to work with.\n\nMany web frameworks use MVC like Rails and Django. It is one of the most common patterns in web development.",
      },
      {
        id: "q4",
        title: "Question 4: Discuss the importance of version control systems",
        content:
          "Version control systems help developers track changes in their code. The most popular one is Git. You can save your work at different points and go back if something breaks.\n\nGit allows multiple people to work on the same project. They can create branches to work on features separately and then merge them back together.\n\nUsing version control is important because it prevents losing code, allows teamwork, and keeps a history of all changes. Every professional developer uses some form of version control.",
      },
    ],
    rubric: [],
    gradingResults: [],
  },
  {
    id: "student-c",
    name: "Student C",
    fileName: "Student_C.pdf",
    questions: [
      {
        id: "q1",
        title: "Question 1: Explain the concept of Object-Oriented Programming",
        content:
          "Object-Oriented Programming (OOP) represents a paradigm shift from procedural programming, organizing software design around data, or objects, rather than functions and logic. At its core, OOP leverages four fundamental principles: encapsulation, abstraction, inheritance, and polymorphism.\n\nEncapsulation bundles data with the methods that operate on it, restricting direct access to internal state through access modifiers. This creates clear interfaces and reduces coupling between components. Abstraction builds on encapsulation by exposing only relevant functionality while hiding implementation complexity, often through abstract classes and interfaces.\n\nInheritance establishes is-a relationships between classes, allowing child classes to inherit and extend parent class behavior. However, modern software engineering increasingly favors composition over inheritance, using dependency injection and interface-based design to achieve flexibility without the rigidity of deep inheritance hierarchies.\n\nPolymorphism, both compile-time (method overloading) and runtime (method overriding through virtual dispatch), enables writing generic code that operates on abstract types. This is foundational to design patterns like Strategy, Observer, and Factory Method.\n\nIn practice, OOP principles are implemented differently across languages. Java enforces strict class-based OOP, Python supports multiple inheritance with Method Resolution Order (MRO), and JavaScript uses prototype-based inheritance. Understanding these nuances is critical for writing idiomatic code in each ecosystem.",
      },
      {
        id: "q2",
        title: "Question 2: Describe the differences between SQL and NoSQL databases",
        content:
          "The distinction between SQL and NoSQL databases reflects fundamentally different approaches to data modeling, consistency guarantees, and scalability strategies.\n\nSQL databases implement the relational model with strict ACID guarantees. Data is normalized into tables with defined schemas, enforced through constraints (primary keys, foreign keys, unique constraints, check constraints). The query optimizer in databases like PostgreSQL can perform complex join operations, window functions, and recursive CTEs efficiently. The CAP theorem trade-off for SQL databases typically favors Consistency and Availability (CA systems) in single-node deployments.\n\nNoSQL databases emerged to address the limitations of relational databases in distributed, high-throughput environments. Document stores (MongoDB, CouchDB) provide schema flexibility and nested data structures. Key-value stores (Redis, DynamoDB) offer sub-millisecond latency for simple lookups. Wide-column stores (Cassandra, HBase) excel at time-series data and write-heavy workloads. Graph databases (Neo4j, Amazon Neptune) optimize for relationship-heavy queries.\n\nThe CAP theorem implications differ: many NoSQL systems choose Availability and Partition tolerance (AP systems), accepting eventual consistency. However, modern databases blur these lines; CockroachDB provides distributed SQL with strong consistency, while MongoDB now supports multi-document ACID transactions.\n\nThe choice between SQL and NoSQL should be driven by data access patterns, consistency requirements, scalability needs, and team expertise rather than technology trends.",
      },
      {
        id: "q3",
        title: "Question 3: Explain the Model-View-Controller (MVC) architecture",
        content:
          "The Model-View-Controller (MVC) architecture originated at Xerox PARC in the 1970s and has since become one of the most influential architectural patterns in software engineering. It enforces separation of concerns by dividing the application into three distinct responsibilities.\n\nThe Model encapsulates the application's data layer and business rules. It is independent of the user interface, making it testable in isolation. Modern implementations often further separate the model into Domain Models (business entities), Repositories (data access), and Services (business logic orchestration).\n\nThe View is responsible for rendering the model data into a user-facing representation. In server-rendered applications, views generate HTML; in client-side applications, views manage DOM updates. The View should contain minimal logic, ideally limited to conditional rendering and iteration.\n\nThe Controller mediates between the Model and View. It receives user input, validates and processes it, interacts with the Model layer, and selects the appropriate View. In RESTful web applications, controllers map HTTP verbs and routes to specific actions.\n\nMVC has evolved into several variants: Model-View-Presenter (MVP), where the Presenter handles all view logic; Model-View-ViewModel (MVVM), popularized by WPF and now common in frameworks like Vue.js; and the Flux/Redux architecture used in React applications, which introduces unidirectional data flow.\n\nThe key benefit of MVC remains testability; each component can be unit tested independently, and the clear separation makes the codebase navigable for teams.",
      },
      {
        id: "q4",
        title: "Question 4: Discuss the importance of version control systems",
        content:
          "Version control systems (VCS) are indispensable infrastructure in modern software engineering, serving as the foundation for collaborative development, continuous integration, and deployment automation.\n\nGit, as a distributed VCS, provides each developer with a complete repository clone, enabling offline work, fast local operations, and resilient backup. The directed acyclic graph (DAG) structure underlying Git's commit history enables powerful operations like cherry-picking, interactive rebasing, and bisecting to find bugs.\n\nBranching strategies significantly impact team productivity. Git Flow provides structured release management with feature, develop, release, and hotfix branches. GitHub Flow simplifies this to feature branches merged into main via pull requests. Trunk-based development minimizes branch divergence through frequent integration and feature flags.\n\nPull requests serve as a critical quality gate, enabling code review, automated testing, and knowledge sharing. Modern platforms integrate security scanning (Dependabot, Snyk), performance benchmarking, and deployment previews into the pull request workflow.\n\nVersion control integrates with CI/CD pipelines to automate testing, building, and deployment. GitOps extends this by using Git as the single source of truth for infrastructure configuration, enabling declarative deployments through tools like ArgoCD and Flux.\n\nBest practices include atomic commits with descriptive messages following Conventional Commits specification, signed commits for security, branch protection rules to prevent force pushes to main, and automated changelog generation from commit history.",
      },
    ],
    rubric: [],
    gradingResults: [],
  },
]

export const mockRubrics: Record<string, QuestionRubric[]> = {
  "student-a": [
    {
      id: "r-a-1",
      questionTitle: "Question 1: Object-Oriented Programming",
      totalPoints: 25,
      criteria: [
        { id: "c1", title: "Definition & Core Concepts", maxPoints: 8, description: "Accurately defines OOP and identifies key concepts" },
        { id: "c2", title: "Four Pillars Explanation", maxPoints: 8, description: "Thoroughly explains encapsulation, abstraction, inheritance, polymorphism" },
        { id: "c3", title: "Practical Application", maxPoints: 5, description: "Provides context for real-world usage" },
        { id: "c4", title: "Clarity & Structure", maxPoints: 4, description: "Well-organized, clear writing" },
      ],
    },
    {
      id: "r-a-2",
      questionTitle: "Question 2: SQL vs NoSQL Databases",
      totalPoints: 25,
      criteria: [
        { id: "c5", title: "SQL Database Description", maxPoints: 7, description: "Accurate description of SQL databases and characteristics" },
        { id: "c6", title: "NoSQL Database Description", maxPoints: 7, description: "Accurate description of NoSQL types and characteristics" },
        { id: "c7", title: "Comparative Analysis", maxPoints: 7, description: "Clear comparison of differences" },
        { id: "c8", title: "Use Case Examples", maxPoints: 4, description: "Appropriate examples and use cases" },
      ],
    },
    {
      id: "r-a-3",
      questionTitle: "Question 3: MVC Architecture",
      totalPoints: 25,
      criteria: [
        { id: "c9", title: "Component Definitions", maxPoints: 8, description: "Clearly defines Model, View, and Controller" },
        { id: "c10", title: "Interaction Flow", maxPoints: 7, description: "Explains how components interact" },
        { id: "c11", title: "Framework Examples", maxPoints: 5, description: "References real-world frameworks" },
        { id: "c12", title: "Benefits & Rationale", maxPoints: 5, description: "Explains why MVC is valuable" },
      ],
    },
    {
      id: "r-a-4",
      questionTitle: "Question 4: Version Control Systems",
      totalPoints: 25,
      criteria: [
        { id: "c13", title: "Core Concepts", maxPoints: 7, description: "Explains VCS fundamentals accurately" },
        { id: "c14", title: "Git Specifics", maxPoints: 7, description: "Demonstrates knowledge of Git" },
        { id: "c15", title: "Collaboration Benefits", maxPoints: 6, description: "Explains teamwork advantages" },
        { id: "c16", title: "Best Practices", maxPoints: 5, description: "Identifies recommended practices" },
      ],
    },
  ],
  "student-b": [
    {
      id: "r-b-1",
      questionTitle: "Question 1: Object-Oriented Programming",
      totalPoints: 25,
      criteria: [
        { id: "c1", title: "Definition & Core Concepts", maxPoints: 8, description: "Accurately defines OOP and identifies key concepts" },
        { id: "c2", title: "Four Pillars Explanation", maxPoints: 8, description: "Thoroughly explains encapsulation, abstraction, inheritance, polymorphism" },
        { id: "c3", title: "Practical Application", maxPoints: 5, description: "Provides context for real-world usage" },
        { id: "c4", title: "Clarity & Structure", maxPoints: 4, description: "Well-organized, clear writing" },
      ],
    },
    {
      id: "r-b-2",
      questionTitle: "Question 2: SQL vs NoSQL Databases",
      totalPoints: 25,
      criteria: [
        { id: "c5", title: "SQL Database Description", maxPoints: 7, description: "Accurate description of SQL databases and characteristics" },
        { id: "c6", title: "NoSQL Database Description", maxPoints: 7, description: "Accurate description of NoSQL types and characteristics" },
        { id: "c7", title: "Comparative Analysis", maxPoints: 7, description: "Clear comparison of differences" },
        { id: "c8", title: "Use Case Examples", maxPoints: 4, description: "Appropriate examples and use cases" },
      ],
    },
    {
      id: "r-b-3",
      questionTitle: "Question 3: MVC Architecture",
      totalPoints: 25,
      criteria: [
        { id: "c9", title: "Component Definitions", maxPoints: 8, description: "Clearly defines Model, View, and Controller" },
        { id: "c10", title: "Interaction Flow", maxPoints: 7, description: "Explains how components interact" },
        { id: "c11", title: "Framework Examples", maxPoints: 5, description: "References real-world frameworks" },
        { id: "c12", title: "Benefits & Rationale", maxPoints: 5, description: "Explains why MVC is valuable" },
      ],
    },
    {
      id: "r-b-4",
      questionTitle: "Question 4: Version Control Systems",
      totalPoints: 25,
      criteria: [
        { id: "c13", title: "Core Concepts", maxPoints: 7, description: "Explains VCS fundamentals accurately" },
        { id: "c14", title: "Git Specifics", maxPoints: 7, description: "Demonstrates knowledge of Git" },
        { id: "c15", title: "Collaboration Benefits", maxPoints: 6, description: "Explains teamwork advantages" },
        { id: "c16", title: "Best Practices", maxPoints: 5, description: "Identifies recommended practices" },
      ],
    },
  ],
  "student-c": [
    {
      id: "r-c-1",
      questionTitle: "Question 1: Object-Oriented Programming",
      totalPoints: 25,
      criteria: [
        { id: "c1", title: "Definition & Core Concepts", maxPoints: 8, description: "Accurately defines OOP and identifies key concepts" },
        { id: "c2", title: "Four Pillars Explanation", maxPoints: 8, description: "Thoroughly explains encapsulation, abstraction, inheritance, polymorphism" },
        { id: "c3", title: "Practical Application", maxPoints: 5, description: "Provides context for real-world usage" },
        { id: "c4", title: "Clarity & Structure", maxPoints: 4, description: "Well-organized, clear writing" },
      ],
    },
    {
      id: "r-c-2",
      questionTitle: "Question 2: SQL vs NoSQL Databases",
      totalPoints: 25,
      criteria: [
        { id: "c5", title: "SQL Database Description", maxPoints: 7, description: "Accurate description of SQL databases and characteristics" },
        { id: "c6", title: "NoSQL Database Description", maxPoints: 7, description: "Accurate description of NoSQL types and characteristics" },
        { id: "c7", title: "Comparative Analysis", maxPoints: 7, description: "Clear comparison of differences" },
        { id: "c8", title: "Use Case Examples", maxPoints: 4, description: "Appropriate examples and use cases" },
      ],
    },
    {
      id: "r-c-3",
      questionTitle: "Question 3: MVC Architecture",
      totalPoints: 25,
      criteria: [
        { id: "c9", title: "Component Definitions", maxPoints: 8, description: "Clearly defines Model, View, and Controller" },
        { id: "c10", title: "Interaction Flow", maxPoints: 7, description: "Explains how components interact" },
        { id: "c11", title: "Framework Examples", maxPoints: 5, description: "References real-world frameworks" },
        { id: "c12", title: "Benefits & Rationale", maxPoints: 5, description: "Explains why MVC is valuable" },
      ],
    },
    {
      id: "r-c-4",
      questionTitle: "Question 4: Version Control Systems",
      totalPoints: 25,
      criteria: [
        { id: "c13", title: "Core Concepts", maxPoints: 7, description: "Explains VCS fundamentals accurately" },
        { id: "c14", title: "Git Specifics", maxPoints: 7, description: "Demonstrates knowledge of Git" },
        { id: "c15", title: "Collaboration Benefits", maxPoints: 6, description: "Explains teamwork advantages" },
        { id: "c16", title: "Best Practices", maxPoints: 5, description: "Identifies recommended practices" },
      ],
    },
  ],
}

export const mockGradingResults: Record<string, GradingResult[]> = {
  "student-a": [
    {
      questionId: "q1",
      questionTitle: "Question 1: Object-Oriented Programming",
      totalPoints: 25,
      earnedPoints: 23,
      criteriaResults: [
        { criterionId: "c1", criterionTitle: "Definition & Core Concepts", maxPoints: 8, earnedPoints: 8, feedback: "Excellent definition of OOP with clear identification of objects, classes, and the four pillars.", confidence: 95 },
        { criterionId: "c2", criterionTitle: "Four Pillars Explanation", maxPoints: 8, earnedPoints: 7, feedback: "Strong explanation of all four pillars. Abstraction could have included a concrete example.", confidence: 88 },
        { criterionId: "c3", criterionTitle: "Practical Application", maxPoints: 5, earnedPoints: 4, feedback: "Good mention of real-world benefits. Could include specific language examples.", confidence: 82 },
        { criterionId: "c4", criterionTitle: "Clarity & Structure", maxPoints: 4, earnedPoints: 4, feedback: "Well-structured response with logical flow between paragraphs.", confidence: 96 },
      ],
      overallFeedback: "A comprehensive and well-organized response demonstrating strong understanding of OOP concepts. The explanation flows logically from definitions through the four pillars to practical implications. Minor improvement possible in providing concrete code examples.",
      highlightedRanges: [{ start: 0, end: 45 }, { start: 200, end: 280 }],
    },
    {
      questionId: "q2",
      questionTitle: "Question 2: SQL vs NoSQL Databases",
      totalPoints: 25,
      earnedPoints: 22,
      criteriaResults: [
        { criterionId: "c5", criterionTitle: "SQL Database Description", maxPoints: 7, earnedPoints: 7, feedback: "Accurate and thorough description of SQL databases with ACID properties mentioned.", confidence: 94 },
        { criterionId: "c6", criterionTitle: "NoSQL Database Description", maxPoints: 7, earnedPoints: 6, feedback: "Good coverage of NoSQL types. Could elaborate more on eventual consistency model.", confidence: 85 },
        { criterionId: "c7", criterionTitle: "Comparative Analysis", maxPoints: 7, earnedPoints: 6, feedback: "Clear comparison points identified. Missing discussion of CAP theorem.", confidence: 80 },
        { criterionId: "c8", criterionTitle: "Use Case Examples", maxPoints: 4, earnedPoints: 3, feedback: "Good examples provided for both SQL and NoSQL databases.", confidence: 87 },
      ],
      overallFeedback: "Strong comparative analysis with good technical accuracy. The response effectively covers both database paradigms with relevant examples. Deeper analysis of consistency models and the CAP theorem would elevate this response further.",
      highlightedRanges: [{ start: 0, end: 60 }, { start: 150, end: 220 }],
    },
    {
      questionId: "q3",
      questionTitle: "Question 3: MVC Architecture",
      totalPoints: 25,
      earnedPoints: 24,
      criteriaResults: [
        { criterionId: "c9", criterionTitle: "Component Definitions", maxPoints: 8, earnedPoints: 8, feedback: "Clear and accurate definitions of all three MVC components.", confidence: 97 },
        { criterionId: "c10", criterionTitle: "Interaction Flow", maxPoints: 7, earnedPoints: 7, feedback: "Excellent explanation of the request-response cycle through MVC.", confidence: 93 },
        { criterionId: "c11", criterionTitle: "Framework Examples", maxPoints: 5, earnedPoints: 5, feedback: "Multiple relevant framework examples provided.", confidence: 95 },
        { criterionId: "c12", criterionTitle: "Benefits & Rationale", maxPoints: 5, earnedPoints: 4, feedback: "Good explanation of separation of concerns. Could mention testability benefits.", confidence: 86 },
      ],
      overallFeedback: "Excellent response with clear component definitions and strong understanding of the interaction flow. The inclusion of real-world framework examples adds practical value. Near-perfect score with only minor room for elaboration on testing benefits.",
      highlightedRanges: [{ start: 0, end: 50 }, { start: 100, end: 180 }],
    },
    {
      questionId: "q4",
      questionTitle: "Question 4: Version Control Systems",
      totalPoints: 25,
      earnedPoints: 23,
      criteriaResults: [
        { criterionId: "c13", criterionTitle: "Core Concepts", maxPoints: 7, earnedPoints: 7, feedback: "Thorough explanation of VCS fundamentals and their importance.", confidence: 94 },
        { criterionId: "c14", criterionTitle: "Git Specifics", maxPoints: 7, earnedPoints: 6, feedback: "Good coverage of Git features. Could include more details on internal workings.", confidence: 84 },
        { criterionId: "c15", criterionTitle: "Collaboration Benefits", maxPoints: 6, earnedPoints: 6, feedback: "Excellent coverage of collaboration advantages including CI/CD integration.", confidence: 92 },
        { criterionId: "c16", criterionTitle: "Best Practices", maxPoints: 5, earnedPoints: 4, feedback: "Good best practices mentioned including branching strategies.", confidence: 88 },
      ],
      overallFeedback: "A well-rounded response covering both theoretical and practical aspects of version control. Strong emphasis on collaboration benefits and modern development practices. The mention of CI/CD integration shows advanced understanding of the development ecosystem.",
      highlightedRanges: [{ start: 0, end: 55 }, { start: 180, end: 250 }],
    },
  ],
  "student-b": [
    {
      questionId: "q1",
      questionTitle: "Question 1: Object-Oriented Programming",
      totalPoints: 25,
      earnedPoints: 14,
      criteriaResults: [
        { criterionId: "c1", criterionTitle: "Definition & Core Concepts", maxPoints: 8, earnedPoints: 5, feedback: "Basic definition provided but lacks depth. Objects and classes mentioned but not thoroughly explained.", confidence: 78 },
        { criterionId: "c2", criterionTitle: "Four Pillars Explanation", maxPoints: 8, earnedPoints: 4, feedback: "Only encapsulation and inheritance discussed. Abstraction and polymorphism are missing.", confidence: 90 },
        { criterionId: "c3", criterionTitle: "Practical Application", maxPoints: 5, earnedPoints: 3, feedback: "Languages mentioned but no concrete examples of OOP in practice.", confidence: 75 },
        { criterionId: "c4", criterionTitle: "Clarity & Structure", maxPoints: 4, earnedPoints: 2, feedback: "Response is understandable but brief. More detail needed.", confidence: 82 },
      ],
      overallFeedback: "The response demonstrates basic familiarity with OOP but lacks the depth expected. Two of the four pillars (abstraction and polymorphism) are not addressed. The answer would benefit significantly from concrete examples and more detailed explanations of each concept.",
      highlightedRanges: [{ start: 0, end: 40 }, { start: 80, end: 140 }],
    },
    {
      questionId: "q2",
      questionTitle: "Question 2: SQL vs NoSQL Databases",
      totalPoints: 25,
      earnedPoints: 15,
      criteriaResults: [
        { criterionId: "c5", criterionTitle: "SQL Database Description", maxPoints: 7, earnedPoints: 4, feedback: "Basic description of SQL databases. Missing ACID properties and normalization concepts.", confidence: 80 },
        { criterionId: "c6", criterionTitle: "NoSQL Database Description", maxPoints: 7, earnedPoints: 4, feedback: "Mentions different storage types but doesn't elaborate on their use cases.", confidence: 76 },
        { criterionId: "c7", criterionTitle: "Comparative Analysis", maxPoints: 7, earnedPoints: 4, feedback: "Basic comparison provided. Lacks technical depth in differentiating factors.", confidence: 73 },
        { criterionId: "c8", criterionTitle: "Use Case Examples", maxPoints: 4, earnedPoints: 3, feedback: "Some examples given. Could provide more specific scenarios.", confidence: 81 },
      ],
      overallFeedback: "The response covers the basic differences but lacks technical depth. Important concepts like ACID properties, CAP theorem, and specific use case scenarios are missing. The answer reads more as an introduction than a thorough comparison.",
      highlightedRanges: [{ start: 0, end: 35 }, { start: 100, end: 150 }],
    },
    {
      questionId: "q3",
      questionTitle: "Question 3: MVC Architecture",
      totalPoints: 25,
      earnedPoints: 16,
      criteriaResults: [
        { criterionId: "c9", criterionTitle: "Component Definitions", maxPoints: 8, earnedPoints: 5, feedback: "Components defined but explanations are surface-level.", confidence: 82 },
        { criterionId: "c10", criterionTitle: "Interaction Flow", maxPoints: 7, earnedPoints: 5, feedback: "Basic flow described with the button click example.", confidence: 79 },
        { criterionId: "c11", criterionTitle: "Framework Examples", maxPoints: 5, earnedPoints: 3, feedback: "Rails and Django mentioned but not elaborated upon.", confidence: 85 },
        { criterionId: "c12", criterionTitle: "Benefits & Rationale", maxPoints: 5, earnedPoints: 3, feedback: "Mentions cleaner code but doesn't explain separation of concerns in depth.", confidence: 77 },
      ],
      overallFeedback: "The response shows familiarity with MVC but lacks depth in all areas. The definitions are correct but brief, and the interaction flow could be more detailed. More discussion of why separation of concerns matters would improve the response.",
      highlightedRanges: [{ start: 0, end: 50 }, { start: 120, end: 180 }],
    },
    {
      questionId: "q4",
      questionTitle: "Question 4: Version Control Systems",
      totalPoints: 25,
      earnedPoints: 14,
      criteriaResults: [
        { criterionId: "c13", criterionTitle: "Core Concepts", maxPoints: 7, earnedPoints: 4, feedback: "Basic tracking concept explained. Missing distributed vs centralized comparison.", confidence: 78 },
        { criterionId: "c14", criterionTitle: "Git Specifics", maxPoints: 7, earnedPoints: 4, feedback: "Branches and merging mentioned. Missing commits, staging, and other key concepts.", confidence: 74 },
        { criterionId: "c15", criterionTitle: "Collaboration Benefits", maxPoints: 6, earnedPoints: 4, feedback: "Teamwork benefits mentioned. No discussion of code review or CI/CD.", confidence: 80 },
        { criterionId: "c16", criterionTitle: "Best Practices", maxPoints: 5, earnedPoints: 2, feedback: "No specific best practices mentioned beyond general usage.", confidence: 72 },
      ],
      overallFeedback: "The response covers the basics of version control but misses important details. There is no discussion of distributed vs centralized systems, staging areas, commit best practices, or integration with development workflows. The answer would benefit from more technical depth.",
      highlightedRanges: [{ start: 0, end: 45 }, { start: 90, end: 135 }],
    },
  ],
  "student-c": [
    {
      questionId: "q1",
      questionTitle: "Question 1: Object-Oriented Programming",
      totalPoints: 25,
      earnedPoints: 25,
      criteriaResults: [
        { criterionId: "c1", criterionTitle: "Definition & Core Concepts", maxPoints: 8, earnedPoints: 8, feedback: "Outstanding definition that contextualizes OOP within the broader paradigm landscape.", confidence: 98 },
        { criterionId: "c2", criterionTitle: "Four Pillars Explanation", maxPoints: 8, earnedPoints: 8, feedback: "Exceptional depth covering compile-time and runtime polymorphism, with design pattern references.", confidence: 97 },
        { criterionId: "c3", criterionTitle: "Practical Application", maxPoints: 5, earnedPoints: 5, feedback: "Excellent cross-language comparison including Java, Python MRO, and JavaScript prototypes.", confidence: 96 },
        { criterionId: "c4", criterionTitle: "Clarity & Structure", maxPoints: 4, earnedPoints: 4, feedback: "Exceptionally well-structured with progressive complexity.", confidence: 99 },
      ],
      overallFeedback: "An outstanding response that goes well beyond the basics. The discussion of composition over inheritance, design patterns, and language-specific implementations demonstrates expert-level understanding. This is a model answer.",
      highlightedRanges: [{ start: 0, end: 60 }, { start: 200, end: 300 }],
    },
    {
      questionId: "q2",
      questionTitle: "Question 2: SQL vs NoSQL Databases",
      totalPoints: 25,
      earnedPoints: 24,
      criteriaResults: [
        { criterionId: "c5", criterionTitle: "SQL Database Description", maxPoints: 7, earnedPoints: 7, feedback: "Thorough SQL coverage including query optimizer capabilities and constraint types.", confidence: 96 },
        { criterionId: "c6", criterionTitle: "NoSQL Database Description", maxPoints: 7, earnedPoints: 7, feedback: "Comprehensive coverage of all four NoSQL categories with specific use cases.", confidence: 94 },
        { criterionId: "c7", criterionTitle: "Comparative Analysis", maxPoints: 7, earnedPoints: 7, feedback: "Excellent CAP theorem analysis with modern database evolution examples.", confidence: 95 },
        { criterionId: "c8", criterionTitle: "Use Case Examples", maxPoints: 4, earnedPoints: 3, feedback: "Strong examples though could include more industry-specific scenarios.", confidence: 85 },
      ],
      overallFeedback: "An excellent response with deep technical analysis. The CAP theorem discussion and mention of modern databases that blur SQL/NoSQL lines shows sophisticated understanding. The recommendation to base decisions on access patterns rather than trends is particularly insightful.",
      highlightedRanges: [{ start: 0, end: 55 }, { start: 180, end: 260 }],
    },
    {
      questionId: "q3",
      questionTitle: "Question 3: MVC Architecture",
      totalPoints: 25,
      earnedPoints: 25,
      criteriaResults: [
        { criterionId: "c9", criterionTitle: "Component Definitions", maxPoints: 8, earnedPoints: 8, feedback: "Excellent definitions with modern implementation details including repository pattern.", confidence: 97 },
        { criterionId: "c10", criterionTitle: "Interaction Flow", maxPoints: 7, earnedPoints: 7, feedback: "Thorough explanation including RESTful routing and HTTP verb mapping.", confidence: 95 },
        { criterionId: "c11", criterionTitle: "Framework Examples", maxPoints: 5, earnedPoints: 5, feedback: "Comprehensive coverage of MVC variants including MVP, MVVM, and Flux/Redux.", confidence: 98 },
        { criterionId: "c12", criterionTitle: "Benefits & Rationale", maxPoints: 5, earnedPoints: 5, feedback: "Strong emphasis on testability and team navigation benefits.", confidence: 96 },
      ],
      overallFeedback: "A model answer that traces MVC from its historical origins to modern variants. The discussion of MVP, MVVM, and Flux/Redux demonstrates broad architectural knowledge. The emphasis on testability as the core benefit shows practical engineering maturity.",
      highlightedRanges: [{ start: 0, end: 65 }, { start: 220, end: 310 }],
    },
    {
      questionId: "q4",
      questionTitle: "Question 4: Version Control Systems",
      totalPoints: 25,
      earnedPoints: 25,
      criteriaResults: [
        { criterionId: "c13", criterionTitle: "Core Concepts", maxPoints: 7, earnedPoints: 7, feedback: "Excellent coverage including DAG structure and advanced operations.", confidence: 97 },
        { criterionId: "c14", criterionTitle: "Git Specifics", maxPoints: 7, earnedPoints: 7, feedback: "Deep Git knowledge including cherry-picking, rebasing, and bisecting.", confidence: 96 },
        { criterionId: "c15", criterionTitle: "Collaboration Benefits", maxPoints: 6, earnedPoints: 6, feedback: "Outstanding coverage of modern development workflows and GitOps.", confidence: 95 },
        { criterionId: "c16", criterionTitle: "Best Practices", maxPoints: 5, earnedPoints: 5, feedback: "Comprehensive best practices including Conventional Commits and signed commits.", confidence: 97 },
      ],
      overallFeedback: "An exceptional response covering both foundational and advanced version control concepts. The discussion of GitOps, Conventional Commits, and branch protection rules demonstrates professional-grade knowledge. This response serves as a comprehensive reference for version control best practices.",
      highlightedRanges: [{ start: 0, end: 70 }, { start: 250, end: 340 }],
    },
  ],
}

export function getSubmissions(): StudentSubmission[] {
  return submissions
}

export function getSubmission(id: string): StudentSubmission | undefined {
  return submissions.find((s) => s.id === id)
}
