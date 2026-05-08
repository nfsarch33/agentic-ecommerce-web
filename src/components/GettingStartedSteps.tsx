interface Step {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly snippet?: string;
}

export interface GettingStartedStepsProps {
  readonly steps?: readonly Step[];
}

const DEFAULT_STEPS: readonly Step[] = [
  {
    id: "register-tenant",
    title: "Register a tenant",
    description:
      "Sign up at /register. Verify your email; the registration aggregate transitions to email_verified and a tenant id is provisioned via the TenantOnboardingWorkflow.",
  },
  {
    id: "scaffold-plugin",
    title: "Scaffold your plugin module",
    description:
      "Create a new Go module and add the SDK as a dependency. The SDK only ships type-aliased lifecycle interfaces -- no internal package imports needed.",
    snippet: `mkdir myplugin && cd myplugin
go mod init github.com/your-org/myplugin
go get github.com/nfsarch33/agentic-ecommerce/pkg/marketplace/sdk`,
  },
  {
    id: "implement-plugin",
    title: "Implement the Plugin interface",
    description:
      "Manifest plus four lifecycle hooks (Install/Activate/Deactivate/Uninstall). Hooks must be idempotent and honour ctx cancellation.",
    snippet: `package myplugin

import (
    "context"

    "github.com/nfsarch33/agentic-ecommerce/pkg/marketplace/sdk"
)

type Plugin struct{}

func (Plugin) Manifest() sdk.Manifest {
    return sdk.Manifest{
        Slug:    "my-plugin",
        Name:    "My Plugin",
        Version: "0.1.0",
        Vendor:  "Your Org",
    }
}

func (Plugin) Install(ctx context.Context, tenantID string) error    { return nil }
func (Plugin) Activate(ctx context.Context, tenantID string) error   { return nil }
func (Plugin) Deactivate(ctx context.Context, tenantID string) error { return nil }
func (Plugin) Uninstall(ctx context.Context, tenantID string) error  { return nil }`,
  },
  {
    id: "smoke-test",
    title: "Run the local sandbox smoke test",
    description:
      "TestSandbox drives your plugin through Install -> Activate -> Deactivate -> Uninstall against the real registry state machine.",
    snippet: `package myplugin_test

import (
    "context"
    "testing"

    "github.com/nfsarch33/agentic-ecommerce/pkg/marketplace/sdk"

    "github.com/your-org/myplugin"
)

func TestPluginSmoke(t *testing.T) {
    p := myplugin.Plugin{}
    sb := sdk.NewTestSandbox(t, p.Manifest())
    sb.SmokeCheck(context.Background(), p)
}`,
  },
  {
    id: "submit-plugin",
    title: "Submit for review",
    description:
      "POST your manifest to /api/v1/marketplace/plugins/submit. The Mission Control admin queue surfaces the row; an approval transitions the manifest into the global catalogue.",
  },
];

export function GettingStartedSteps({ steps = DEFAULT_STEPS }: GettingStartedStepsProps) {
  return (
    <ol data-testid="getting-started-steps" className="flex flex-col gap-6">
      {steps.map((step, idx) => (
        <li
          key={step.id}
          data-testid={`getting-started-step-${step.id}`}
          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white"
            >
              {idx + 1}
            </span>
            <h2 className="text-lg font-semibold text-slate-900">{step.title}</h2>
          </div>
          <p className="text-sm text-slate-700">{step.description}</p>
          {step.snippet ? (
            <pre
              data-testid={`getting-started-snippet-${step.id}`}
              className="overflow-x-auto rounded-md bg-slate-900 p-4 text-xs text-slate-100"
            >
              <code>{step.snippet}</code>
            </pre>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
