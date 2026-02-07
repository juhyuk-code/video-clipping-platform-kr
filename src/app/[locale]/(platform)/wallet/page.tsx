"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Wallet as WalletIcon,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  TrendingUp,
} from "lucide-react";
import { formatKRW } from "@/lib/utils";

const TX_TYPE_ICONS: Record<string, typeof ArrowDownCircle> = {
  DEPOSIT: ArrowDownCircle,
  WITHDRAWAL: ArrowUpCircle,
  ESCROW_HOLD: Lock,
  ESCROW_RELEASE: ArrowUpCircle,
  REWARD_PAYOUT: TrendingUp,
  PLATFORM_FEE: ArrowUpCircle,
  REFUND: ArrowDownCircle,
};

const TX_TYPE_COLORS: Record<string, string> = {
  DEPOSIT: "text-green-600",
  WITHDRAWAL: "text-red-600",
  ESCROW_HOLD: "text-yellow-600",
  ESCROW_RELEASE: "text-green-600",
  REWARD_PAYOUT: "text-green-600",
  PLATFORM_FEE: "text-red-600",
  REFUND: "text-green-600",
};

export default function WalletPage() {
  const t = useTranslations("wallet");
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function fetchWallet() {
    try {
      const res = await fetch("/api/v1/wallet");
      if (!res.ok) throw new Error("Failed to fetch wallet");
      const data = await res.json();
      setWallet(data);
    } catch {
      setError("지갑 정보를 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWallet();
  }, []);

  async function handleDeposit() {
    const amount = Number(depositAmount);
    if (!amount || amount < 1000) {
      setError("최소 1,000원 이상 충전 가능합니다");
      return;
    }

    setDepositing(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "충전에 실패했습니다");
      }
      setDepositAmount("");
      fetchWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setDepositing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  const balance = Number(wallet?.balance ?? 0);
  const escrow = Number(wallet?.escrowHeld ?? 0);
  const available = balance;
  const totalDeposited = Number(wallet?.totalDeposited ?? 0);
  const totalEarned = Number(wallet?.totalEarned ?? 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <WalletIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("balance")}</p>
              <p className="text-2xl font-bold">{formatKRW(available)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
              <Lock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("escrowHeld")}</p>
              <p className="text-2xl font-bold">{formatKRW(escrow)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <ArrowDownCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("totalDeposited")}</p>
              <p className="text-2xl font-bold">{formatKRW(totalDeposited)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("totalEarned")}</p>
              <p className="text-2xl font-bold">{formatKRW(totalEarned)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deposit Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t("deposit")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="number"
              placeholder={t("depositPlaceholder")}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              min={1000}
              step={1000}
              className="max-w-xs"
            />
            <Button onClick={handleDeposit} disabled={depositing}>
              {depositing ? "충전 중..." : t("deposit")}
            </Button>
          </div>
          <div className="mt-3 flex gap-2">
            {[10000, 50000, 100000, 500000].map((amt) => (
              <Button
                key={amt}
                variant="outline"
                size="sm"
                onClick={() => setDepositAmount(String(amt))}
              >
                +{formatKRW(amt)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recentTransactions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!wallet?.transactions?.length ? (
            <p className="py-8 text-center text-muted-foreground">{t("noTransactions")}</p>
          ) : (
            <div className="space-y-3">
              {wallet.transactions.map((tx: any) => {
                const Icon = TX_TYPE_ICONS[tx.type] ?? ArrowDownCircle;
                const colorClass = TX_TYPE_COLORS[tx.type] ?? "text-muted-foreground";
                const isPositive = ["DEPOSIT", "ESCROW_RELEASE", "REWARD_PAYOUT", "REFUND"].includes(tx.type);
                return (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${colorClass}`} />
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                      {isPositive ? "+" : "-"}{formatKRW(Number(tx.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
