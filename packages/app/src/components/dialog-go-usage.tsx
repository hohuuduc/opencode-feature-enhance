import { DateTime } from "luxon"
import { createMemo, createResource, createSignal, For, Match, Show, Switch } from "solid-js"
import { useLanguage } from "@/context/language"
import { useServerSDK } from "@/context/server-sdk"
import { authTokenFromCredentials } from "@/utils/server"
import { Button } from "@opencode-ai/ui/button"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Progress } from "@opencode-ai/ui/progress"

type UsageWindow = { status: "ok" | "rate-limited"; percent: number; resetsAt: string }
type ProviderUsage = { usage: { rolling: UsageWindow; weekly: UsageWindow; monthly: UsageWindow } }
type UsageError = { name?: string; data?: { message?: string } }

type UsageResult =
  | { kind: "ok"; usage: ProviderUsage["usage"] }
  | { kind: "not-connected" }
  | { kind: "error"; message?: string }

async function fetchGoUsage(input: { url: string; headers?: Record<string, string> }): Promise<UsageResult> {
  const response = await fetch(`${input.url}/provider/opencode-go/usage`, { headers: input.headers })
  const body = (await response.json().catch(() => undefined)) as ProviderUsage | UsageError | undefined
  if (response.status === 200 && body && "usage" in body) return { kind: "ok", usage: body.usage }
  if (response.status === 404 && body && "name" in body && body.name === "ProviderNotConnected") {
    return { kind: "not-connected" }
  }
  return { kind: "error", message: body && "data" in body ? body.data?.message : undefined }
}

const usageWindows = [
  { key: "rolling", i18n: "dialog.usage.rolling" },
  { key: "weekly", i18n: "dialog.usage.weekly" },
  { key: "monthly", i18n: "dialog.usage.monthly" },
] as const

export function DialogGoUsage() {
  const dialog = useDialog()
  const language = useLanguage()
  const serverSDK = useServerSDK()
  const [reload, setReload] = createSignal(0)

  const [usage, { refetch }] = createResource(reload, async (): Promise<UsageResult> => {
    try {
      const http = serverSDK().server.http
      const headers = http.password
        ? { Authorization: `Basic ${authTokenFromCredentials({ username: http.username, password: http.password })}` }
        : undefined
      return await fetchGoUsage({ url: serverSDK().url, headers })
    } catch {
      return { kind: "error" }
    }
  })
  const result = createMemo<UsageResult | undefined>(() =>
    usage.state === "ready" || usage.state === "refreshing" ? usage.latest : undefined,
  )
  const usageValue = createMemo(() => {
    const value = result()
    return value?.kind === "ok" ? value.usage : undefined
  })
  const connect = () => {
    void import("@/components/dialog-connect-provider").then((x) => {
      const controller = x.useProviderConnectController()
      controller.select("opencode-go")
      void dialog.show(() => <x.DialogConnectProvider controller={controller} />, () => setReload((v) => v + 1))
    })
  }

  const formatReset = (iso: string) =>
    DateTime.fromISO(iso)
      .setLocale(language.intl())
      .toLocaleString(DateTime.DATETIME_MED)

  return (
    <Show
      when={usageValue()}
      fallback={<UsageFallback loading={!result()} result={result()} onConnect={connect} onRefresh={() => void refetch()} />}
    >
      {(usage) => (
        <Dialog title={language.t("dialog.usage.title")} fit>
          <div class="flex flex-col gap-5 pl-6 pr-2.5 pb-3">
            <For each={usageWindows}>
              {(window) => {
                const value = () => usage()[window.key]
                const percent = () => value().percent
                const rateLimited = () => value().status === "rate-limited"
                return (
                  <div class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between">
                      <span class="text-14-medium">{language.t(window.i18n)}</span>
                      <span
                        classList={{
                          "text-12-medium": true,
                          "text-text-danger-base": rateLimited(),
                        }}
                      >
                        {percent()}% {language.t(rateLimited() ? "dialog.usage.status.rateLimited" : "dialog.usage.status.ok")}
                      </span>
                    </div>
                    <Progress value={percent()} maxValue={100} />
                    <div class="text-11-regular text-text-weaker">
                      {language.t("dialog.usage.resetsAt", { time: formatReset(value().resetsAt) })}
                    </div>
                  </div>
                )
              }}
            </For>
            <div class="flex items-center justify-end">
              <Button
                variant="ghost"
                size="large"
                onClick={() => {
                  void refetch()
                }}
              >
                {language.t("dialog.usage.refresh")}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </Show>
  )
}

function UsageFallback(props: {
  loading: boolean
  result: UsageResult | undefined
  onConnect: () => void
  onRefresh: () => void
}) {
  const dialog = useDialog()
  const language = useLanguage()

  return (
    <Switch fallback={<UsageErrorDialog result={props.result} onRefresh={props.onRefresh} />}>
      <Match when={props.loading}>
        <Dialog title={language.t("dialog.usage.title")} fit>
          <div class="flex justify-center py-4">
            <span class="text-12-regular text-text-weak">
              {language.t("common.loading")}
              {language.t("common.loading.ellipsis")}
            </span>
          </div>
        </Dialog>
      </Match>
      <Match when={props.result?.kind === "not-connected"}>
        <Dialog
          title={language.t("dialog.usage.notConnected.title")}
          description={language.t("dialog.usage.notConnected.description")}
          fit
        >
          <div class="flex flex-col gap-4 pl-6 pr-2.5 pb-3">
            <div class="flex justify-end gap-2">
              <Button variant="ghost" size="large" onClick={() => dialog.close()}>
                {language.t("common.cancel")}
              </Button>
              <Button variant="primary" size="large" onClick={props.onConnect}>
                {language.t("dialog.usage.connect.action")}
              </Button>
            </div>
          </div>
        </Dialog>
      </Match>
    </Switch>
  )
}

function UsageErrorDialog(props: { result: UsageResult | undefined; onRefresh: () => void }) {
  const language = useLanguage()
  const message = () => {
    const result = props.result
    if (!result || result.kind !== "error") return undefined
    return result.message
  }

  return (
    <Dialog
      title={language.t("dialog.usage.error.title")}
      description={language.t("dialog.usage.error.description")}
      fit
    >
      <div class="flex flex-col gap-4 pl-6 pr-2.5 pb-3">
        <Show when={message()}>{(value) => <div class="text-14-regular text-text-weak">{value()}</div>}</Show>
        <div class="flex justify-end">
          <Button variant="primary" size="large" onClick={props.onRefresh}>
            {language.t("dialog.usage.refresh")}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
