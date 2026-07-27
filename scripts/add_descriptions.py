"""
Add description fields to all modes in .roomodes that are missing them.
"""
import re

# Curated descriptions from plans/modes-subtitles-plan.md
CURATED_DESCRIPTIONS = {
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


def process_roomodes(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    output = []
    i = 0
    modified_count = 0
    already_had_count = 0
    skipped_count = 0

    while i < len(lines):
        line = lines[i]
        slug_match = re.match(r'  - slug: (\S+)', line)

        if slug_match:
            slug = slug_match.group(1)

            if slug in CURATED_DESCRIPTIONS:
                desc = CURATED_DESCRIPTIONS[slug]

                # Find the name: line and description within this mode block
                name_line_idx = None
                has_desc = False
                block_end = len(lines)

                for j in range(i + 1, len(lines)):
                    next_line = lines[j]
                    # Stop if we hit the next mode entry or end
                    if next_line.startswith('  - slug:'):
                        block_end = j
                        break
                    if next_line.startswith('    name:'):
                        name_line_idx = j
                    if next_line.startswith('    description:'):
                        has_desc = True

                if name_line_idx is not None and not has_desc:
                    # Output lines from current position up to and including name
                    output.extend(lines[i:name_line_idx + 1])
                    # Insert description
                    output.append(f'    description: {desc}\n')
                    modified_count += 1
                    # Move past the name line
                    i = name_line_idx + 1
                elif name_line_idx is not None and has_desc:
                    already_had_count += 1
                    # Pass through all lines until block end or next slug
                    output.extend(lines[i:block_end])
                    i = block_end
                else:
                    skipped_count += 1
                    output.append(line)
                    i += 1
            else:
                output.append(line)
                i += 1
        else:
            output.append(line)
            i += 1

    with open(filepath, 'w') as f:
        f.writelines(output)

    return modified_count, already_had_count, skipped_count


if __name__ == '__main__':
    count, existing, skipped = process_roomodes('.roomodes')
    print(f"Modified modes (added description): {count}")
    print(f"Already had description: {existing}")
    print(f"Skipped (no name line found): {skipped}")
