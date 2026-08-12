#!/usr/bin/env python3
"""
ensure_descriptions.py — single deterministic, idempotent mode-description tool.

Consolidates the former fix_descriptions.py, add_descriptions.py and
fix_missing_descriptions.py into ONE tool for the canonical mode set:

  * custom-modes/custom_modes.d/           (nested customModes list, one per file) [CANONICAL]

Canonical source of truth
  * custom-modes/custom_modes.d/ is the canonical store (290 modes) and feeds
    scripts/sync-custom-modes.mjs -> .roomodes + the Modes Marketplace.
  * The obsolete custom-modes/agents/ and custom-modes/vs-code/converted_modes.d/
    sets (and the monolithic custom_modes.yaml) were removed; this tool enforces
    descriptions on the canonical set only.

Guarantees
  * Canonical store: USER_FRIENDLY_DESCRIPTIONS is the source of truth.
    CURATED_DESCRIPTIONS (legacy, .roomodes-era) is fully subsumed by it and kept
    only for provenance; on conflict USER_FRIENDLY_DESCRIPTIONS wins.
  * Deterministic: identical input -> identical output on every run.
  * Idempotent: re-running produces ZERO churn.
  * Never destroys a good description: a curated entry always wins for slugs it
    knows; for unknown slugs an existing good description is preserved and only
    missing/clone-of-roleDefinition descriptions are derived from
    whenToUse -> roleDefinition first line.
  * Surgical edits: only the `description:` scalar is replaced in place; all other
    lines, comments, formatting and ordering are preserved byte-for-byte (unlike
    the old yaml.dump round-trip that rewrote whole files).

Usage:
  python3 scripts/ensure_descriptions.py                 # enforce on the canonical set
  python3 scripts/ensure_descriptions.py --check         # dry-run; exit 1 if changes pending
  python3 scripts/ensure_descriptions.py --report        # summary + slug drift report (no writes)
  python3 scripts/ensure_descriptions.py --self-test     # run in-memory self checks
"""

import argparse
import os
import re
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent

# Hierarchical tag identifying this process; every log line is prefixed so CI
# logs are greppable per process.
TAG = "ENSURE:DESCRIPTIONS"


def log(msg: str) -> None:
    print(f"[{TAG}] {msg}")

# The submodule path can be overridden (e.g. by scripts/ensure_descriptions.spec.mjs
# or CI fixtures) so the enforcer can be exercised against a temp copy without
# touching the real custom-modes submodule. Mirrors the ROO_SUBMODULE_PATH
# override honored by scripts/sync-custom-modes.mjs and verify-submodule-pin.mjs.
SUBMODULE_PATH = os.environ.get("ROO_SUBMODULE_PATH", "custom-modes")
CUSTOM_MODES_ROOT = REPO_ROOT / SUBMODULE_PATH

# name -> (directory, format)
# The canonical catalog is custom_modes.d/ (nested `customModes:` wrapper, one per
# file). The legacy agents/ and vs-code/converted_modes.d/ sets are removed.
SETS = {
    "custom_modes.d": (CUSTOM_MODES_ROOT / "custom_modes.d", "nested"),
}

# ---------------------------------------------------------------------------
# Canonical curated descriptions.
#
# Generated from the union of USER_FRIENDLY_DESCRIPTIONS (custom-modes/scripts/
# fix_descriptions.py) and CURATED_DESCRIPTIONS (scripts/add_descriptions.py),
# with USER_FRIENDLY_DESCRIPTIONS winning on slug conflict. CURATED_DESCRIPTIONS
# is currently a strict subset of USER_FRIENDLY_DESCRIPTIONS, so the union ==
# USER_FRIENDLY_DESCRIPTIONS (237 slugs). Duplicate keys in the legacy source
# resolve to the last occurrence, matching the behaviour of the old tool.
# ---------------------------------------------------------------------------
CANONICAL_DESCRIPTIONS = {
    'ai-engineer': 'Designs and implements AI systems including model selection, agentic workflows, and production deployment.',
    'machine-learning-engineer': 'Deploys and serves ML models in production with scalable inference pipelines and monitoring.',
    'llm-architect': 'Architects large language model systems including deployment, fine-tuning, RAG, and prompt optimization.',
    'prompt-engineer': 'Designs and optimizes prompts for large language models to achieve reliable, high-quality outputs.',
    'rag-evaluator': 'Builds evaluation suites for RAG/LLM systems measuring retrieval quality, faithfulness, and hallucination rates.',
    'business-analyst': 'Gathers requirements, analyzes processes, and recommends data-driven business improvements.',
    'customer-success-manager': 'Drives customer retention, adoption, and growth through proactive engagement and success planning.',
    'i18n-l10n-reviewer': 'Validates internationalization and localization quality including ICU messages, RTL support, and cultural adaptation.',
    'technical-writer': 'Produces clear, accurate technical documentation, guides, and reference materials.',
    'ux-researcher': 'Conducts user research, usability testing, and data analysis to inform product design decisions.',
    'growth-experimentation-lead': 'Designs and manages experimentation programs with A/B testing and metric-driven optimization.',
    'marketing-strategist': 'Develops data-driven marketing strategies across digital channels, brand development, and campaign optimization.',
    'product-manager': 'Defines product strategy, prioritizes features, and bridges user needs with business goals.',
    'sales-engineer': 'Provides technical pre-sales support, designs solution architectures, and builds proof-of-concepts.',
    'architect-reviewer': 'Reviews system architectures for scalability, security, and adherence to design patterns.',
    'microservices-architect': 'Designs and coordinates distributed microservice ecosystems with service boundaries and inter-service communication.',
    'backend-developer': 'Builds secure, scalable server-side applications, APIs, and microservices with robust data handling.',
    'frontend-developer': 'Crafts performant, accessible, and maintainable user interfaces using modern frontend frameworks.',
    'fullstack-developer': 'Develops end-to-end features across the entire stack — from database to user interface.',
    'algorithmic-problem-solver': 'Designs and implements optimal algorithms with rigorous correctness and complexity analysis.',
    'api-designer': 'Creates well-structured REST and GraphQL APIs with comprehensive documentation and great developer experience.',
    'ask': 'Guides users in navigating, scoping, and delegating tasks to the appropriate specialized modes.',
    'blockchain-developer': 'Develops Web3 applications including smart contracts, DeFi protocols, and cross-chain solutions.',
    'compiler-engineer': 'Designs compiler toolchains including lexing, parsing, IR design, optimization passes, and code generation.',
    'content-strategist': 'Develops content strategies, editorial calendars, and content architectures aligned with business goals.',
    'deep-research-protocol': 'Conducts systematic, multi-source research and produces publication-ready analytical reports.',
    'functional-programming-expert': 'Designs purely functional, composable systems with strong type systems and algebraic reasoning.',
    'integration': 'Merges outputs from multiple development modes into a working, tested, production-ready system.',
    'mcp': 'Connects to and manages external services through MCP (Management Control Panel) interfaces.',
    'mobile-developer': 'Builds performant cross-platform mobile applications with native platform features.',
    'performance-engineer': 'Identifies bottlenecks and optimizes system performance across application, database, and infrastructure layers.',
    'post-deployment-monitoring-mode': 'Monitors system health, performance, and errors after deployment to detect and report issues.',
    'refinement-optimization-mode': 'Refactors, modularizes, and optimizes existing code for better performance and maintainability.',
    'sdk-developer': 'Designs developer-friendly SDKs with ergonomic APIs, strong typing, and clear documentation.',
    'ui-expert': 'Creates intuitive, visually appealing user interfaces following design system principles and accessibility standards.',
    'web-design-specialist': 'Designs and builds modern websites with responsive layouts, accessibility, and performance optimization.',
    'cloud-architect': 'Designs multi-cloud architectures with cost optimization, scalability, and security best practices.',
    'database-administrator': 'Manages database systems for high availability, performance, backup/recovery, and security.',
    'deployment-engineer': 'Automates release processes, manages deployment strategies, and ensures reliable rollouts.',
    'devops-architect': 'Designs cloud-native CI/CD pipelines, container orchestration, and infrastructure automation.',
    'devops-engineer': 'Implements CI/CD pipelines, containerization, monitoring, and infrastructure-as-code solutions.',
    'finops-optimizer': 'Analyzes and optimizes cloud spending through rightsizing, commitments, and cost-aware architecture decisions.',
    'observability-architect': 'Designs monitoring, logging, and tracing systems with SLI/SLO definition and actionable alerting.',
    'network-engineer': 'Designs and manages cloud and hybrid network architectures with security and performance optimization.',
    'sql-pro': 'Optimizes complex database queries, designs schemas, and tunes performance across major SQL databases.',
    'compliance-specialist': 'Ensures regulatory compliance across GDPR, HIPAA, SOX, and other frameworks with cross-jurisdiction expertise.',
    'corporate-law': 'Provides legal guidance on corporate governance, mergers & acquisitions, and business transactions.',
    'intellectual-property': 'Provides legal guidance on patents, trademarks, copyrights, and trade secret protection.',
    'oss-license-auditor': 'Validates third-party dependencies, generates SBOMs, and ensures open source license compliance.',
    'agent-organizer': 'Organizes multi-agent teams, assigns roles, and orchestrates collaborative problem-solving.',
    'build-engineer': 'Optimizes build systems, compilation strategies, and developer productivity toolchains.',
    'bullshit-detection-analyst': 'Critically evaluates claims and information sources for credibility, accuracy, and logical consistency.',
    'competitive-analyst': 'Analyzes competitor strategies, market positioning, and industry trends to identify opportunities.',
    'data-analyst': 'Transforms raw data into actionable business insights through analysis, visualization, and reporting.',
    'data-engineer': 'Builds scalable data pipelines, ETL/ELT processes, and data infrastructure for analytics and ML.',
    'database-optimizer': 'Tunes database queries, indexes, and schemas for maximum performance and scalability.',
    'dependency-manager': 'Manages package dependencies, audits for security vulnerabilities, and resolves version conflicts.',
    'documentation-engineer': 'Creates comprehensive technical documentation systems with API docs, tutorials, and automated generation.',
    'error-coordinator': 'Coordinates error handling across distributed systems with failure recovery and resilience patterns.',
    'feature-flag-orchestrator': 'Manages feature flag lifecycles including safe rollouts, kill-switches, and flag cleanup.',
    'git-workflow-manager': 'Manages Git branching strategies, automation hooks, and team Git workflows.',
    'knowledge-synthesizer': 'Extracts insights, identifies patterns, and builds collective intelligence from multi-source information.',
    'market-researcher': 'Conducts market analysis, consumer research, and competitive intelligence to inform strategy.',
    'multi-agent-coordinator': 'Manages inter-agent communication, task delegation, and distributed coordination across agents.',
    'refactoring-specialist': 'Safely restructures and improves existing code without changing external behavior.',
    'release-governance-lead': 'Orchestrates release readiness reviews, coordinates stakeholders, and enforces release policies.',
    'task-distributor': 'Intelligently allocates work across available resources with load balancing and queue management.',
    'website-foundation-planner': 'Creates comprehensive website planning dossiers with folder structures and best-practice alignment.',
    'workflow-orchestrator': 'Designs and coordinates complex multi-step workflows and business process automation.',
    'code-reviewer': 'Reviews code for quality, security vulnerabilities, and adherence to best practices.',
    'code-skeptic': 'Critically examines code for assumptions, edge cases, and potential issues with a questioning mindset.',
    'cybersecurity-expert': 'Identifies and mitigates security vulnerabilities across applications, networks, and infrastructure.',
    'penetration-tester': 'Conducts ethical penetration testing to identify security weaknesses and validate defenses.',
    'secrets-hygiene-auditor': 'Scans repositories for hardcoded secrets, migrates to secret stores, and enforces rotation policies.',
    'security-auditor': 'Performs comprehensive security assessments, compliance validation, and risk management reviews.',
    'zero-trust-strategist': 'Designs zero-trust security architectures with adaptive access controls and continuous verification.',
    'qa-expert': 'Designs comprehensive test strategies and ensures quality across unit, integration, and E2E testing.',
    'tdd': 'Implements Test-Driven Development with tests written first, followed by minimal implementation and refactoring.',
    'test-automator': 'Builds automated test frameworks with CI/CD integration for reliable, repeatable testing.',
    'agentic-swarm-conductor': 'Orchestrates multi-agent swarms with hive-mind coordination and stuck-state recovery.',
    'problem-solving-maestro': 'Applies systematic problem-solving heuristics and multi-perspective analysis.',
    'uiux-vibe-master': 'Ensures pixel-perfect, accessible, and aesthetically cohesive user interfaces.',
    'anti-fiction-sentinel': 'Verifies claims and assertions against evidence, ensuring factual accuracy and logical consistency.',
    'core-reasoning-architect': 'Provides foundational reasoning architecture and structured thinking for complex problem-solving.',
    'fintech-engineer': 'Builds financial systems with regulatory compliance, secure transaction processing, and audit trails.',
    'creative-director': 'Leads brand identity, visual design, and creative strategy across digital and traditional media.',
    'financial-analyst': 'Builds financial models, conducts investment analysis, and provides strategic financial planning.',
    'payment-integration': 'Integrates payment gateways with PCI compliance, transaction routing, and error handling.',
    'risk-manager': 'Assesses and mitigates risks across operations, security, compliance, and business continuity.',
    'iot-engineer': 'Develops connected device solutions with edge computing, sensor integration, and IoT platform architecture.',
    'architect': 'Designs scalable, modular system architectures with clear component boundaries and integration patterns.',
    'code': 'Writes clean, modular, production-ready code following architecture specifications and best practices.',
    'silent-coder': 'Executes coding tasks autonomously with minimal interaction, following pre-defined specifications.',
    'spec-pseudocode': 'Translates high-level requirements into detailed pseudocode and implementation specifications.',
    'sparc': 'Guides users through the SPARC methodology: Specification, Implementation, Architecture, Refinement, Completion.',
    'tutorial': 'Creates educational content and tutorials to onboard users and teach development workflows.',
    'frontend-architecture-engineer': 'Designs scalable frontend architectures including state management, routing, component boundaries, and build pipelines.',
    'frontend-performance-auditor': 'Audits frontend applications for performance bottlenecks, Core Web Vitals, and optimization opportunities.',
    'react-optimization-director': 'Analyzes and optimizes React applications for rendering performance, bundle size, and用户体验.',
    'electron-pro': 'Builds cross-platform desktop applications with native features and optimized performance.',
    'cli-tool-developer': 'Designs and builds command-line interfaces with intuitive argument parsing, output formatting, and error handling.',
    'bff-engineer': 'Designs Backend-for-Frontend (BFF) API layers optimized for specific client application needs.',
    'concurrency-specialist': 'Designs and implements concurrent and parallel systems with thread-safe, deadlock-free execution.',
    'database-migration-engineer': 'Plans and executes safe database schema migrations with rollback strategies and zero-downtime deployment.',
    'data-pipeline-engineer': 'Builds data processing pipelines for ETL/ELT workflows, stream processing, and batch analytics.',
    'streaming-systems-engineer': 'Designs real-time data streaming systems using Kafka, Flink, or similar technologies.',
    'wasm-systems-developer': 'Develops WebAssembly modules for high-performance browser and server-side applications.',
    'realtime-collaboration-engineer': 'Builds real-time collaborative features including WebSockets, CRDTs, and operational transforms.',
    'embedded-firmware-developer': 'Develops embedded firmware and IoT device software with resource-constrained optimization.',
    'game-engine-developer': 'Builds game engines and game development tools with rendering, physics, and asset pipelines.',
    'api-contract-first-developer': 'Designs APIs using a contract-first approach with OpenAPI specs and automated validation.',
    'graphql-resolver-writer': 'Implements efficient GraphQL resolvers with data loading optimization and schema stitching.',
    'product-owner': 'Manages product backlogs, prioritizes features, and bridges business requirements with technical implementation.',
    'typescript-pro': 'Writes type-safe TypeScript code with advanced type system features and strict mode compliance.',
    'python-developer': 'Builds Python applications using modern frameworks like FastAPI, Django, and async patterns.',
    'python-pro': 'Writes production-grade Python with performance optimization, type hints, and testing best practices.',
    'rust-developer': 'Develops safe, high-performance Rust applications leveraging ownership, borrowing, and zero-cost abstractions.',
    'golang-developer': 'Builds concurrent, performant Go services with strong typing and idiomatic Go patterns.',
    'java-developer': 'Develops enterprise Java applications with Spring Boot, microservices, and JVM optimization.',
    'java-architect': 'Designs Java enterprise architectures with Spring ecosystem, microservices decomposition, and JVM tuning.',
    'kotlin-specialist': 'Builds Kotlin applications for Android, backend, and multiplatform projects with coroutines and flows.',
    'swift-expert': 'Develops Swift applications for Apple platforms with modern SwiftUI, concurrency, and performance patterns.',
    'csharp-developer': 'Builds .NET applications with C# following modern language features and framework best practices.',
    'dotnet-core-expert': 'Develops cross-platform .NET Core applications with ASP.NET, Entity Framework, and cloud-native patterns.',
    'cpp-pro': 'Writes high-performance C++ code with modern standards, template metaprogramming, and zero-overhead abstractions.',
    'flutter-expert': 'Develops cross-platform mobile and desktop apps with Flutter and Dart.',
    'react-specialist': 'Develops React applications with hooks, context, Suspense, and modern rendering patterns.',
    'vue-expert': 'Builds Vue.js applications with Composition API, Pinia state management, and component architecture.',
    'angular-architect': 'Develops Angular applications with RxJS, NgRx, modular architecture, and enterprise patterns.',
    'nextjs-developer': 'Builds Next.js applications with SSR, ISR, App Router, and full-stack React capabilities.',
    'rails-expert': 'Develops Ruby on Rails applications following convention-over-configuration and MVC patterns.',
    'django-developer': 'Builds Django web applications with ORM, admin interface, REST framework, and async views.',
    'spring-boot-engineer': 'Develops Spring Boot microservices with auto-configuration, Actuator, and cloud-native patterns.',
    'laravel-specialist': 'Builds Laravel PHP applications with Eloquent ORM, artisan CLI, and modern PHP patterns.',
    'php-pro': 'Writes modern PHP with strict types, PSR standards, and framework-agnostic clean architecture.',
    'javascript-pro': 'Writes modern JavaScript with ES2024+ features, async patterns, and cross-platform compatibility.',
    'javascript-developer': 'Builds JavaScript applications with modern tooling, Node.js, and frontend/backend integration.',
    'nlp-specialist': 'Applies natural language processing techniques including transformers, embeddings, and text analytics.',
    'data-scientist': 'Analyzes data, builds predictive models, and extracts actionable insights using statistical methods and ML.',
    'dataset-curator': 'Creates, validates, and maintains high-quality datasets for ML training with balance and coverage checks.',
    'computer-vision': 'Develops computer vision solutions using deep learning for image and video analysis.',
    'mlops-engineer': 'Operationalizes ML pipelines with CI/CD for models, feature stores, experiment tracking, and monitoring.',
    'model-registry-auditor': 'Audits ML model registries for versioning, lineage, governance, and compliance with ML lifecycle policies.',
    'kubernetes-specialist': 'Orchestrates containerized workloads on Kubernetes with service mesh, scaling, and operational excellence.',
    'terraform-engineer': 'Manages infrastructure as code using Terraform with modular, reusable, and state-managed configurations.',
    'terraform-module-author': 'Creates reusable, versioned Terraform modules following composition patterns and best practices.',
    'platform-engineer': 'Builds internal developer platforms with self-service infrastructure, golden paths, and paved roads.',
    'serverless-platform-architect': 'Designs serverless architectures with function compute, event-driven patterns, and managed services.',
    'site-readiness-engineer': 'Ensures production readiness through load testing, chaos engineering, and reliability validation.',
    'chaos-engineer': 'Proactively tests system resilience through controlled failure injection and chaos experiments.',
    'chaos-resilience-lead': 'Leads chaos engineering programs to build fault-tolerant, self-healing distributed systems.',
    'incident-responder': 'Responds to production incidents with systematic triage, mitigation, and post-mortem analysis.',
    'hardware-acceleration-engineer': 'Optimizes workloads using GPUs, FPGAs, and specialized hardware accelerators.',
    'security-engineer': 'Implements security controls, threat modeling, and secure architecture patterns.',
    'cloud-security-architect': 'Designs secure cloud architectures with identity management, encryption, and compliance controls.',
    'security-review': 'Conducts security-focused code reviews identifying vulnerabilities and recommending fixes.',
    'compliance-specialist-canada': 'Ensures regulatory compliance with Canadian standards and privacy legislation.',
    'compliance-specialist-usa': 'Ensures regulatory compliance with US federal and state regulations.',
    'compliance-auditor-canada': 'Audits systems and processes for compliance with Canadian regulatory requirements.',
    'compliance-auditor-usa': 'Audits systems and processes for compliance with US regulatory requirements.',
    'compliance-automation-engineer': 'Automates compliance enforcement through policy-as-code and continuous compliance monitoring.',
    'ai-prompt-security-specialist': 'Secures AI systems against prompt injection, data leakage, and other LLM-specific threats.',
    'accessibility-tester': 'Audits digital products for WCAG compliance, screen reader compatibility, and inclusive design.',
    'error-detective': 'Investigates and diagnoses errors across logs, traces, and metrics to identify root causes.',
    'debugger': 'Systematically troubleshoots code issues using breakpoints, logging, and root-cause analysis.',
    'framework-currency': 'Audits project dependencies and updates them to latest stable versions with migration guidance.',
    'dx-optimizer': 'Improves developer workflows through streamlined tooling, automation, and friction reduction.',
    'legacy-modernizer': 'Modernizes legacy codebases by incrementally upgrading architecture, dependencies, and practices.',
    'project-manager': 'Orchestrates project timelines, resources, and deliverables to ensure on-time, on-scope completion.',
    'scrum-master': 'Facilitates Agile ceremonies, removes impediments, and coaches teams on Scrum practices.',
    'content-marketer': 'Creates and distributes valuable content to attract, engage, and convert target audiences.',
    'product-analytics-scientist': 'Analyzes product usage metrics, user behavior, and feature adoption to guide product strategy.',
    'research-analyst': 'Gathers and synthesizes information from multiple sources to produce actionable research findings.',
    'digital-marketing-specialist': 'Executes multi-channel digital marketing campaigns with measurement and optimization.',
    'performance-copywriter': 'Creates persuasive, conversion-optimized copy for marketing, advertising, and brand communications.',
    'seo-strategist': 'Develops comprehensive SEO strategies including keyword research, on-page optimization, and link building.',
    'technical-seo-optimizer': 'Optimizes technical SEO factors including crawlability, indexation, structured data, and site architecture.',
    'core-web-vitals-seo': 'Optimizes Core Web Vitals metrics including LCP, FID/INP, and CLS for search ranking improvement.',
    'local-seo-specialist': 'Optimizes local search presence including Google Business Profile, local citations, and review management.',
    'ecommerce-seo-specialist': 'Optimizes ecommerce sites for search including product pages, category structure, and technical SEO.',
    'ai-content-seo': 'Creates and optimizes AI-generated content for search engines while maintaining quality and relevance.',
    'instagram-content-creator': 'Creates engaging Instagram content with visual storytelling, caption psychology, and platform trends.',
    'ai-art-director': 'Directs AI-powered visual art creation across photography, illustration, game art, and design disciplines.',
    'investigative-reporter': 'Thoroughly researches topics, uncovers connections, and produces comprehensive investigative reports.',
    'excel-power-user': 'Creates advanced Excel spreadsheets with formulas, pivot tables, macros, and data visualization.',
    'powerpoint-presenter': 'Designs professional PowerPoint presentations with compelling visuals and clear narrative structure.',
    'corporate-law-usa': 'Provides legal guidance on US corporate law including governance, M&A, and securities compliance.',
    'corporate-law-canada': 'Provides legal guidance on Canadian corporate law including governance, M&A, and securities compliance.',
    'criminal-law': 'Provides legal analysis and guidance on criminal law matters.',
    'criminal-law-usa': 'Provides legal analysis on US criminal law including federal and state jurisdiction matters.',
    'criminal-law-canada': 'Provides legal analysis on Canadian criminal law including Criminal Code and provincial matters.',
    'employment-law': 'Provides legal guidance on employment law including hiring, termination, discrimination, and workplace policies.',
    'employment-law-usa': 'Provides legal guidance on US employment law including federal and state labor regulations.',
    'employment-law-canada': 'Provides legal guidance on Canadian employment law including provincial and federal standards.',
    'intellectual-property-usa': 'Provides legal guidance on US intellectual property law including USPTO procedures and enforcement.',
    'litigation-support': 'Provides litigation support including case analysis, document review, and legal research.',
    'litigation-support-usa': 'Provides litigation support for US legal proceedings including federal and state court procedures.',
    'litigation-support-canada': 'Provides litigation support for Canadian legal proceedings including court procedures and rules.',
    'legal-advisor': 'Provides comprehensive legal advice across multiple practice areas and jurisdictions.',
    'legal-advisor-usa': 'Provides legal advice on US law across multiple practice areas and federal/state jurisdictions.',
    'legal-advisor-canada': 'Provides legal advice on Canadian law across multiple practice areas and provincial/federal jurisdictions.',
    'performance-monitor': 'Tracks and analyzes system performance metrics to identify regressions and optimization opportunities.',
    'performance-benchmark': 'Designs and runs performance benchmarks to measure and compare system behavior under load.',
    'context-manager': 'Manages and provides relevant context across agent interactions for coherent multi-step workflows.',
    'tooling-engineer': 'Builds and maintains developer tooling, automation scripts, and productivity enhancements.',
    'cli-developer': 'Designs and implements command-line tools with intuitive interfaces and robust error handling.',
    'api-governance-lead': 'Enforces API design standards, consistency rules, and governance policies across the organization.',
    'search-specialist': 'Implements and optimizes search functionality including full-text search, faceted search, and ranking.',
    'research-scientist': 'Conducts scientific research, literature reviews, and experimental design for technical investigations.',
    'tech-research-strategist': 'Evaluates emerging technologies and provides strategic recommendations for technology adoption.',
    'trend-analyst': 'Identifies and analyzes technology and market trends to inform product and strategy decisions.',
    'data-researcher': 'Gathers, validates, and analyzes data from multiple sources to support research and decision-making.',
    'formula-cascade-oracle': 'Applies Fractal Formula Notation for systematic, multi-layered analytical reasoning.',
    'fractal-elaborator': 'Performs deep recursive analysis with infinite zoom into architectural and conceptual details.',
    'high-perf-engineer': 'Delivers high-performance engineering solutions with optimization at every layer of the stack.',
    'sota-stack-master': 'Applies state-of-the-art engineering practices across the full development stack.',
    'devops-observability-sentinel': 'Monitors system observability and ensures comprehensive telemetry coverage.',
    'cognitive-multi-thinker': 'Simulates multiple reasoning perspectives for comprehensive problem analysis.',
    'game-developer': 'Builds games across platforms with graphics, physics, audio, and engaging gameplay mechanics.',
    'supabase-admin': 'Manages Supabase projects including database, authentication, storage, and real-time subscriptions.',
    'websocket-engineer': 'Implements real-time WebSocket communication with connection management, scaling, and fallback strategies.',
    'powershell-assistant': 'Automates Windows tasks using PowerShell scripts, modules, and system administration.',
    'powershell-autopilot': 'Autonomously executes PowerShell-based system administration and automation tasks.',
    'graphql-architect': 'Designs efficient, scalable GraphQL schemas with federation, data loading optimization, and resolver patterns.',
    'claude-code': 'An elite software engineer specializing in systematic code optimization and full-stack development.',
    'edge-computing-architect': 'Designs geo-distributed, low-latency edge computing architectures for real-time applications.',
    'postgres-pro': 'Administers and optimizes PostgreSQL databases with performance tuning, replication, and high availability.',
    'incident-command-director': 'Coordinates major incident response with structured command, communication, and resolution tracking.',
    'sre-engineer': 'Balances feature velocity with system reliability through SLOs, error budgets, and automation.',
    'systems-expert': 'Specializes in high-performance computing, kernel development, and systems-level optimization.',
    'intellectual-property-canada': 'Provides legal guidance on Canadian IP law including CIPO procedures, patents, and trademarks.',
    'experience-polish-director': 'Leads multidisciplinary QA for web experiences, ensuring pixel-perfect, polished user interactions.',
    'policy-as-code-auditor': 'Enforces compliance policies using OPA/Rego with automated drift detection and enforcement.',
    'supply-chain-security-auditor': 'Safeguards build systems and software supply chains against compromise and dependency attacks.',
    'api-documenter': 'Creates comprehensive, developer-friendly API documentation with examples, specifications, and guides.',
    'embedded-systems': 'Programs microcontrollers, RTOS, and embedded firmware with resource-constrained optimization.',
    'quant-analyst': 'Builds quantitative financial models, algorithmic trading strategies, and risk analytics.',
}

# Legacy CURATED_DESCRIPTIONS (scripts/add_descriptions.py). Fully subsumed by
# CANONICAL_DESCRIPTIONS — kept here only for provenance/auditing.
LEGACY_CURATED_DESCRIPTIONS = {
    "ai-engineer": "Expert in AI system design, model implementation, and production deployment",
    "machine-learning-engineer": "Expert in production model deployment, serving infrastructure, and scalable ML systems",
    "llm-architect": "Expert in large language model architecture, deployment, and optimization",
    "prompt-engineer": "Expert in designing, optimizing, and managing prompts for large language models",
    "rag-evaluator": "Builds evaluation suites for retrieval quality, guardrails, and safety",
    "business-analyst": "Expert in requirements gathering, process improvement, and data-driven decision making",
    "customer-success-manager": "Expert in customer retention, growth, and advocacy",
    "i18n-l10n-reviewer": "Ensures localization readiness, translation quality, and accessibility of content across locales",
    "technical-writer": "Expert in clear, accurate documentation and content creation",
    "ux-researcher": "Expert in user insights, usability testing, and data-driven design decisions",
    "growth-experimentation-lead": "Orchestrates high-velocity tests, growth loops, and measurable revenue impact",
    "marketing-strategist": "Elite strategist in digital marketing, growth hacking, brand development, and data-driven campaigns",
    "product-manager": "Expert in product strategy, user-centric development, and business outcomes",
    "sales-engineer": "Expert in technical pre-sales, solution architecture, and proof of concepts",
    "architect-reviewer": "Expert in system design validation, architectural patterns, and technical decision assessment",
    "microservices-architect": "Distributed systems architect designing scalable microservice ecosystems",
    "backend-developer": "Senior backend engineer specializing in scalable API development and microservices",
    "frontend-developer": "Expert UI engineer focused on crafting robust, scalable frontend solutions",
    "fullstack-developer": "End-to-end feature owner with expertise across the entire stack",
    "algorithmic-problem-solver": "Designs and implements optimal algorithms with focus on correctness and complexity",
    "api-designer": "API architecture expert designing scalable, developer-friendly interfaces",
    "ask": "Task-formulation guide that helps users navigate, ask, and delegate tasks",
    "blockchain-developer": "Elite blockchain developer specializing in 2026 Web3 technologies",
    "compiler-engineer": "Designs and optimizes compilers and toolchains",
    "content-strategist": "Expert Content Strategy specialist with research capabilities",
    "deep-research-protocol": "Systematic research analyst producing publication-ready reports",
    "functional-programming-expert": "Designs purely functional, composable systems with strong types",
    "integration": "Merges outputs of all modes into working, tested, production-ready systems",
    "mcp": "MCP integration specialist for connecting to and managing external services",
    "mobile-developer": "Cross-platform mobile specialist building performant native experiences",
    "performance-engineer": "Expert in system optimization, bottleneck identification, and scalability",
    "post-deployment-monitoring-mode": "Observes system post-launch, collecting performance, logs, and user feedback",
    "refinement-optimization-mode": "Refactors, modularizes, and improves system performance",
    "sdk-developer": "Designs developer-friendly SDKs with ergonomic APIs and strong typing",
    "ui-expert": "Expert UI/UX Designer with mastery over interface design principles",
    "web-design-specialist": "Expert in modern web development, UI/UX, accessibility, and performance",
    "cloud-architect": "Expert in multi-cloud strategies, scalable architectures, and cost-effective solutions",
    "database-administrator": "Expert in high-availability systems, performance optimization, and disaster recovery",
    "deployment-engineer": "Expert in CI/CD pipelines, release automation, and deployment strategies",
    "devops-architect": "Elite specialist in cloud-native infrastructure, CI/CD automation, and platform engineering",
    "devops-engineer": "Expert bridging development and operations with comprehensive automation",
    "finops-optimizer": "Drives cloud cost efficiency through rightsizing, commitment management, and architecture improvements",
    "observability-architect": "Defines SLI/SLOs, golden signals, and telemetry standards for reliable systems",
    "network-engineer": "Expert in cloud and hybrid network architectures, security, and performance optimization",
    "sql-pro": "Expert in complex query optimization, database design, and performance tuning",
    "compliance-specialist": "Meticulous specialist in regulatory adherence across multiple jurisdictions",
    "corporate-law": "Elite specialist in securities law, M&A, corporate governance, and business transactions",
    "intellectual-property": "Elite specialist in patents, trademarks, copyrights, and trade secrets",
    "oss-license-auditor": "Enforces license policy via SBOMs, license detection, and remediation guidance",
    "agent-organizer": "Expert in multi-agent orchestration, team assembly, and workflow optimization",
    "build-engineer": "Expert in build system optimization, compilation strategies, and productivity",
    "bullshit-detection-analyst": "Expert in identifying misinformation using evidence-based verification",
    "competitive-analyst": "Expert in competitor intelligence, strategic analysis, and market positioning",
    "data-analyst": "Expert in business intelligence, data visualization, and statistical analysis",
    "data-engineer": "Expert in building scalable data pipelines and data infrastructure",
    "database-optimizer": "Expert in query optimization, performance tuning, and scalability",
    "dependency-manager": "Expert in package management, security auditing, and version conflict resolution",
    "documentation-engineer": "Expert in technical documentation systems and developer-friendly content",
    "error-coordinator": "Expert in distributed error handling, failure recovery, and system resilience",
    "feature-flag-orchestrator": "Manages safe rollouts, kill-switches, and debt cleanup",
    "git-workflow-manager": "Expert in branching strategies, automation, and team collaboration",
    "knowledge-synthesizer": "Expert in extracting insights from multi-agent interactions",
    "market-researcher": "Expert in market analysis, consumer insights, and competitive intelligence",
    "multi-agent-coordinator": "Expert in complex workflow orchestration and inter-agent communication",
    "refactoring-specialist": "Expert mastering safe code transformation and design pattern application",
    "release-governance-lead": "Ensures every release meets quality, security, and compliance gates",
    "task-distributor": "Expert in intelligent work allocation, load balancing, and queue management",
    "website-foundation-planner": "Plans directory structure and best-practice alignment for new website projects",
    "workflow-orchestrator": "Expert in complex process design, state machine implementation, and automation",
    "code-reviewer": "Expert in code quality, security vulnerabilities, and best practices",
    "code-skeptic": "Skeptical and critical code quality inspector who questions everything",
    "cybersecurity-expert": "Elite specialist in threat detection, vulnerability assessment, and security architecture",
    "penetration-tester": "Expert in ethical hacking, vulnerability assessment, and security testing",
    "secrets-hygiene-auditor": "Eliminates hardcoded secrets, enforces rotation, and ensures secure management",
    "security-auditor": "Expert in comprehensive security assessments, compliance validation, and risk management",
    "zero-trust-strategist": "Implements identity-centric access, continuous verification, and micro-segmentation",
    "qa-expert": "Expert in comprehensive quality assurance, test strategy, and quality metrics",
    "tdd": "Implements Test-Driven Development, writing tests first",
    "test-automator": "Expert in building robust test frameworks and CI/CD integration",
    "agentic-swarm-conductor": "Hive-Mind Orchestrator & Stuck-State Recovery Specialist",
    "problem-solving-maestro": "Master of All Heuristics and Systemic Intervention",
    "uiux-vibe-master": "Aesthetic Intelligence and Zero-Accident Layout Enforcer",
    "anti-fiction-sentinel": "Truth Enforcer and Neuro-Symbolic Verifier",
    "core-reasoning-architect": "Immutable foundation of all reasoning",
    "fintech-engineer": "Expert in financial systems, regulatory compliance, and secure transaction processing",
    "creative-director": "Elite specialist in brand identity, digital experiences, and creative campaign development",
    "financial-analyst": "Elite specialist in financial modeling, investment analysis, and risk assessment",
    "payment-integration": "Expert in payment gateway integration, PCI compliance, and financial transactions",
    "risk-manager": "Expert in comprehensive risk assessment, mitigation strategies, and compliance",
    "iot-engineer": "Expert in connected device architectures, edge computing, and IoT platforms",
}

# Sanity: CURATED must never contain a slug the canonical map does not.
assert set(LEGACY_CURATED_DESCRIPTIONS) <= set(CANONICAL_DESCRIPTIONS), (
    "LEGACY_CURATED_DESCRIPTIONS contains slugs absent from CANONICAL_DESCRIPTIONS"
)


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------
def _strip_you_are(text: str) -> str:
    """Remove leading 'You are ...' style prefixes."""
    text = text.strip()
    for pattern in (
        r"^You are an?\s+(?:advanced\s+)?(?:Expert\s+)?",
        r"^You are an?\s+(?:elite\s+)?",
        r"^You are an?\s+(?:Senior\s+)?",
        r"^You are an?\s+(?:expert\s+)?",
        r"^You are the\s+",
        r"^You are a\s+",
        r"^You are an\s+",
        r"^You are\s+",
    ):
        if re.match(pattern, text, re.IGNORECASE):
            return re.sub(pattern, "", text, flags=re.IGNORECASE)
    return text


def is_clone(description: str, role_definition: str) -> bool:
    """True when description is an unhelpful copy of roleDefinition."""
    if not description or not role_definition:
        return True
    desc_clean = description.strip().rstrip(".")
    role_clean = role_definition.strip()
    if desc_clean in role_clean:
        return True
    first_sent = role_clean.split(".")[0].strip().rstrip(".")
    if desc_clean == first_sent:
        return True
    stripped_role = _strip_you_are(first_sent).strip()
    if desc_clean == stripped_role:
        return True
    if len(desc_clean) > 20 and role_clean.startswith(desc_clean):
        return True
    return False


def is_good(description: str, role_definition: str) -> bool:
    """A description is 'good' if it exists and is not a clone of roleDefinition."""
    if not description or not isinstance(description, str):
        return False
    desc = description.strip()
    if len(desc) < 20:
        return False
    if is_clone(desc, role_definition or ""):
        return False
    return True


def derive_description(name: str, when_to_use: str, role_definition: str) -> str:
    """Deterministic derivation fallback: whenToUse -> roleDefinition first line."""
    text = (when_to_use or "").strip() or (role_definition or "").strip()
    if not text:
        return ""
    text = re.sub(
        r"^(activate\s+this\s+mode\s+when\s+you\s+need(?:\s+an?\s+|\s+the\s+|\s+a\s+|\s+)"
        r"|use\s+this\s+mode\s+when\s+)",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = _strip_you_are(text)
    text = re.sub(r"^(?:an?|the)\s+", "", text, flags=re.IGNORECASE)
    first = text.split(".")[0].strip().rstrip(".")
    if not first:
        return ""
    first = first[0].upper() + first[1:]
    return first + "."


def desired_description(mode: dict):
    """Return the description this mode SHOULD have, or None to leave it alone."""
    slug = mode.get("slug", "")
    canonical = CANONICAL_DESCRIPTIONS.get(slug)
    if canonical:
        return canonical
    current = (mode.get("description") or "").strip()
    role = (mode.get("roleDefinition") or "").strip()
    if is_good(current, role):
        return None  # keep a good description — never destroy it
    derived = derive_description(mode.get("name", ""), mode.get("whenToUse", ""), role)
    return derived or None


# ---------------------------------------------------------------------------
# Surgical YAML editing (preserves everything except the `description:` scalar)
# ---------------------------------------------------------------------------
def _encode_scalar(value: str) -> str:
    """Encode a scalar as a single, unwrapped YAML line (plain or quoted)."""
    dumped = yaml.safe_dump(value, allow_unicode=True, default_flow_style=False, width=1000000).strip()
    # safe_dump of a bare scalar appends a '...' document-end marker; drop it so
    # the result can be inlined as `key: <scalar>`.
    if dumped.endswith("..."):
        dumped = dumped[:-3].rstrip()
    return dumped


def _consume_scalar_span(lines, idx, key_indent):
    """Return index just past the scalar starting at lines[idx]."""
    n = len(lines)
    rest = lines[idx].lstrip(" \t")
    after = rest.split(":", 1)[1].lstrip() if ":" in rest else ""
    block = after.startswith("|") or after.startswith(">")
    j = idx + 1
    while j < n:
        line = lines[j]
        if line.strip() == "":
            if block:
                j += 1
                continue
            break
        cur_indent = len(line) - len(line.lstrip(" \t"))
        if cur_indent > key_indent:
            j += 1
            continue
        break
    return j


def set_description_in_text(text: str, mode_slug: str, new_value: str, fmt: str):
    """Replace the `description:` scalar for mode_slug. Returns (new_text, replaced)."""
    lines = text.splitlines(keepends=True)
    n = len(lines)

    if fmt == "flat":
        # Top-level keys; description is the only `description:` at indent 0.
        desc_re = re.compile(r"^description:")
        for i, line in enumerate(lines):
            if desc_re.match(line):
                end = _consume_scalar_span(lines, i, 0)
                encoded = _encode_scalar(new_value)
                new_lines = lines[:i] + [f"description: {encoded}\n"] + lines[end:]
                return "".join(new_lines), True
        return text, False

    # nested: locate the mode block `- slug: <mode_slug>` then its `description:`
    slug_re = re.compile(r"^(\s*)- slug:\s*[\"']?%s[\"']?\s*$" % re.escape(mode_slug))
    for i, line in enumerate(lines):
        sm = slug_re.match(line.rstrip("\n"))
        if not sm:
            continue
        block_indent = len(sm.group(1))
        desc_re = re.compile(r"^(\s*)description:")
        j = i + 1
        while j < n:
            raw = lines[j].rstrip("\n")
            # stop at the next sibling mode block
            if re.match(r"^%s- slug:" % (" " * block_indent), raw) and j > i + 1:
                break
            dm = desc_re.match(raw)
            if dm and len(dm.group(1)) > block_indent:
                desc_indent = len(dm.group(1))
                end = _consume_scalar_span(lines, j, desc_indent)
                encoded = _encode_scalar(new_value)
                new_lines = lines[:j] + [f"{dm.group(1)}description: {encoded}\n"] + lines[end:]
                return "".join(new_lines), True
            j += 1
        # No description present: insert one after the `name:` line in the block.
        name_re = re.compile(r"^(\s*)name:")
        j = i + 1
        while j < n:
            raw = lines[j].rstrip("\n")
            if re.match(r"^%s- slug:" % (" " * block_indent), raw) and j > i + 1:
                break
            nm = name_re.match(raw)
            if nm and len(nm.group(1)) > block_indent:
                encoded = _encode_scalar(new_value)
                new_lines = lines[: j + 1] + [f"{nm.group(1)}description: {encoded}\n"] + lines[j + 1 :]
                return "".join(new_lines), True
            j += 1
        # No name line: insert right after the slug line.
        encoded = _encode_scalar(new_value)
        insert_indent = "  " if block_indent == 0 else " " * (block_indent + 2)
        new_lines = lines[: i + 1] + [f"{insert_indent}description: {encoded}\n"] + lines[i + 1 :]
        return "".join(new_lines), True
    return text, False


def _validate_description(text: str, mode_slug: str, fmt: str, expected: str) -> bool:
    """Re-parse after a surgical edit and confirm the description landed intact."""
    data = yaml.safe_load(text)
    if fmt == "flat":
        mode = data if isinstance(data, dict) else {}
    else:
        modes = (data or {}).get("customModes") or []
        mode = modes[0] if modes and isinstance(modes[0], dict) else {}
    return bool(mode) and (mode.get("description") or "").strip() == expected


# ---------------------------------------------------------------------------
# Directory processing
# ---------------------------------------------------------------------------
def yaml_files_in(directory: Path):
    return sorted(
        [p for p in directory.rglob("*.yaml") if p.is_file()]
        + [p for p in directory.rglob("*.yml") if p.is_file()]
    )


def load_first_mode(path: Path, fmt: str):
    """Return the mode dict for a file, or None if not a valid mode file."""
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    if fmt == "flat":
        return data if isinstance(data, dict) and data.get("slug") else None
    if not isinstance(data, dict):
        return None
    modes = data.get("customModes")
    if not isinstance(modes, list) or not modes or not isinstance(modes[0], dict):
        return None
    return modes[0]


def process_file(path: Path, fmt: str, dry_run: bool = False):
    """Enforce the description on one file. Returns (slug, changed)."""
    mode = load_first_mode(path, fmt)
    if not mode:
        return None, False
    slug = mode.get("slug")
    desired = desired_description(mode)
    current = (mode.get("description") or "").strip()
    if desired is None or desired == current:
        return slug, False
    if dry_run:
        return slug, True
    text = path.read_text(encoding="utf-8")
    new_text, replaced = set_description_in_text(text, slug, desired, fmt)
    if not replaced:
        return slug, False
    if not _validate_description(new_text, slug, fmt, desired):
        raise RuntimeError(f"Description edit failed validation for {path}")
    path.write_text(new_text, encoding="utf-8")
    return slug, True


def collect_slugs():
    """Return {set_name: {slug, ...}} for the canonical mode set."""
    result = {}
    for name, (directory, fmt) in SETS.items():
        slugs = set()
        if directory.exists():
            for path in yaml_files_in(directory):
                mode = load_first_mode(path, fmt)
                if mode and mode.get("slug"):
                    slugs.add(mode["slug"])
        result[name] = slugs
    return result


def print_drift_report() -> int:
    """Print description coverage for the canonical set. Returns total slug count."""
    slugs = collect_slugs()
    custom = slugs.get("custom_modes.d", set())
    total_drift = len(custom)
    log("=== Coverage report (canonical source: custom-modes/custom_modes.d/) ===")
    log(f"  custom_modes.d: {len(custom)} slugs")

    # Description coverage
    log("  description coverage:")
    for name, (directory, fmt) in SETS.items():
        if not directory.exists():
            log(f"    {name}: directory missing")
            continue
        missing = []
        clones = []
        for path in yaml_files_in(directory):
            mode = load_first_mode(path, fmt)
            if not mode:
                continue
            desc = (mode.get("description") or "").strip()
            role = (mode.get("roleDefinition") or "").strip()
            if not desc:
                missing.append(mode.get("slug"))
            elif is_clone(desc, role):
                clones.append(mode.get("slug"))
        log(f"    {name}: missing={len(missing)} clone-of-roleDef={len(clones)}")
        if missing:
            log(f"      missing: {', '.join(sorted(missing))}")
        if clones:
            log(f"      clones: {', '.join(sorted(clones))}")
    return total_drift


def run_self_test() -> int:
    """In-memory self checks; no repository files are touched."""
    import tempfile

    failures = []

    def check(label, cond):
        print(("  ok  " if cond else "  FAIL") + f" {label}")
        if not cond:
            failures.append(label)

    # --- pure helpers ---
    check("is_clone detects copy", is_clone("You design scalable architectures", "You design scalable architectures"))
    check("is_clone tolerates good desc", not is_clone("Designs scalable system architectures.", "You design scalable architectures"))
    check("derive from roleDefinition", derive_description("", "", "You are an Expert AI engineer specializing in AI systems.") == "AI engineer specializing in AI systems.")
    check(
        "derive from whenToUse",
        derive_description("", "Activate this mode when you need an Expert AI engineer for systems.", "")
        == "Expert AI engineer for systems.",
    )
    check("curated wins over good desc", desired_description({"slug": "architect", "description": "old", "roleDefinition": "r"})
          == CANONICAL_DESCRIPTIONS["architect"])
    check("good desc preserved for unknown slug", desired_description(
        {"slug": "zzz-new", "description": "A genuinely good description that is not a clone.", "roleDefinition": "You are X."}) is None)

    # --- surgical replacer (flat) ---
    flat = "slug: foo\nname: Foo\ncategory: core-development\ndescription: Old description here.\nroleDefinition: You are Foo.\ngroups:\n- read\n"
    new_flat, replaced = set_description_in_text(flat, "foo", "New description.", "flat")
    check("flat replaced", replaced and "description: New description." in new_flat)
    check("flat preserves rest", "slug: foo" in new_flat and "roleDefinition: You are Foo." in new_flat and "groups:" in new_flat)
    check("flat valid", _validate_description(new_flat, "foo", "flat", "New description."))

    # --- surgical replacer (nested, multi-line block scalar for whenToUse etc.) ---
    nested = "customModes:\n- slug: bar\n  name: Bar\n  description: Old bar description here.\n  roleDefinition: You are Bar.\n  whenToUse: |\n    Activate this mode\n    when you need Bar.\n  groups:\n  - read\n"
    new_nested, replaced = set_description_in_text(nested, "bar", "Brand new bar description.", "nested")
    check("nested replaced", replaced and "description: Brand new bar description." in new_nested)
    check("nested preserves block", "whenToUse: |" in new_nested and "Activate this mode" in new_nested)
    check("nested valid", _validate_description(new_nested, "bar", "nested", "Brand new bar description."))

    # --- idempotency of the replacer ---
    again, replaced_again = set_description_in_text(new_flat, "foo", "New description.", "flat")
    check("replacer idempotent", not replaced_again or again == new_flat)

    # --- canonical store self-consistency ---
    check("canonical non-empty", len(CANONICAL_DESCRIPTIONS) >= 200)
    check("canonical values non-empty", all(v and v.strip() for v in CANONICAL_DESCRIPTIONS.values()))

    print(f"\nself-test: {len(failures)} failure(s)")
    return 1 if failures else 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="ensure_descriptions.py",
        description="Deterministic, idempotent mode-description enforcer for the custom-modes sets.",
    )
    parser.add_argument(
        "--dir",
        choices=["all", "custom_modes.d"],
        default="all",
        help="Which set to process (default: all)",
    )
    parser.add_argument("--check", action="store_true", help="Dry-run: report pending changes, write nothing; exit 1 if changes are needed")
    parser.add_argument("--report", action="store_true", help="Print summary + slug drift report, write nothing")
    parser.add_argument("--self-test", action="store_true", help="Run in-memory self checks and exit")
    args = parser.parse_args(argv)

    if args.self_test:
        return run_self_test()

    log("starting mode-description enforcement (canonical set: custom_modes.d)")
    if not CUSTOM_MODES_ROOT.exists():
        log("⚠ custom-modes/ not found — run `git submodule update --init` first.")
        return 1

    dirs_to_process = [
        (name, SETS[name]) for name in ("custom_modes.d",)
        if args.dir == "all" or args.dir == name
    ]

    grand_total = grand_changed = grand_errors = 0
    for name, (directory, fmt) in dirs_to_process:
        if not directory.exists():
            log(f"=== {name}: directory missing ({directory}) — skipping ===")
            continue
        files = yaml_files_in(directory)
        changed = []
        errors = []
        for path in files:
            try:
                slug, did_change = process_file(path, fmt, dry_run=args.check or args.report)
                if slug is None:
                    continue
                grand_total += 1
                if did_change:
                    changed.append(slug)
                    if not (args.check or args.report):
                        log(f"  ✓ {path.relative_to(REPO_ROOT)}")
            except Exception as exc:  # noqa: BLE001 - surface any per-file failure
                errors.append((path, exc))
        grand_changed += len(changed)
        grand_errors += len(errors)
        mode = "would change" if (args.check or args.report) else "changed"
        log(f"=== {name}: {len(files)} files, {len(changed)} {mode}, {len(errors)} errors ===")
        if changed:
            log(f"    {', '.join(sorted(changed))}")
        for path, exc in errors:
            log(f"    ✗ {path.relative_to(REPO_ROOT)}: {exc}")

    log(f"SUMMARY: {grand_total} modes processed, {grand_changed} {('pending' if (args.check or args.report) else 'modified')}, {grand_errors} errors")

    if args.report:
        drift = print_drift_report()
        log(f"Total slugs in canonical set: {drift}")
        return 0

    # --check is a CI-visible gate: non-zero when descriptions still need fixing.
    if args.check:
        log("CHECK RESULT: " + ("FAIL — descriptions pending" if grand_changed > 0 else "PASS — no descriptions pending"))
        return 1 if grand_changed > 0 else 0

    return 1 if grand_errors > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
