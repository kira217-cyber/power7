import React from "react";
import { Loader2, Users as UsersIcon } from "lucide-react";

const money = (value) => Number(value || 0).toFixed(2);

/**
 * প্লেয়ার ও অ্যাফিলিয়েট — দুই তালিকারই এক চেহারা।
 *
 * পার্থক্য শুধু কমিশনের কলামগুলো, তাই `showCommission` দিয়ে সেটুকু
 * বাড়ানো-কমানো হয়; দুবার একই টেবিল লেখার দরকার পড়ে না।
 */
/**
 * অবস্থার চিপ।
 *
 * অ্যাফিলিয়েটের আবেদন এখনো অনুমোদিত না হলে সেটাই দেখানো হয়, `isActive`
 * নয় — নতুন অ্যাকাউন্টে `isActive` সত্যি থাকে, ফলে অপেক্ষায় থাকা
 * আবেদনও "Active" দেখাত আর অ্যাডমিন ভাবতেন কাজ শেষ।
 */
const StatusChip = ({ row }) => {
  const pendingReview =
    row.role === "aff-user" &&
    row.affiliateStatus &&
    row.affiliateStatus !== "approved";

  const look = !pendingReview
    ? row.isActive !== false
      ? { label: "Active", color: "var(--status-success)" }
      : { label: "Disabled", color: "var(--status-danger)" }
    : row.affiliateStatus === "rejected"
      ? { label: "Rejected", color: "var(--status-danger)" }
      : { label: "Pending", color: "var(--status-pending)" };

  return (
    <span
      className="rounded-full px-2 py-[2px] text-[11px] font-bold"
      style={{
        background: `color-mix(in srgb, ${look.color}, transparent 88%)`,
        color: look.color,
      }}
    >
      {look.label}
    </span>
  );
};

const UserTable = ({ rows, loading, showCommission, onOpen }) => {
  if (loading) {
    return (
      <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="ad-card flex flex-col items-center gap-3 py-10 text-center">
        <UsersIcon size={28} className="text-[var(--text-disabled)]" />
        <p className="text-[15px] font-semibold text-[var(--neutral100)]">
          Nobody here
        </p>
        <p className="text-[13px] text-[var(--text-muted)]">
          No account matches this filter.
        </p>
      </div>
    );
  }

  const heads = [
    "Username",
    "Phone",
    "Balance",
    ...(showCommission ? ["Commission due", "Rates"] : ["Referred by"]),
    "Joined",
    "Status",
    "",
  ];

  return (
    <div className="ad-card ad-table-wrap ad-scroll p-0">
      <table className="w-full min-w-[880px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/[0.07]">
            {heads.map((head, index) => (
              <th
                key={`${head}-${index}`}
                className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const due =
              Number(row.referCommissionBalance || 0) +
              Number(row.depositCommissionBalance || 0) +
              Number(row.gameLossCommissionBalance || 0) -
              Number(row.gameWinCommissionBalance || 0);

            return (
              <tr
                key={row._id}
                className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3">
                  <p className="text-[14px] font-semibold text-[var(--neutral100)]">
                    {row.userId}
                  </p>
                  {(row.firstName || row.lastName) && (
                    <p className="text-[12px] text-[var(--text-muted)]">
                      {`${row.firstName || ""} ${row.lastName || ""}`.trim()}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                  {row.countryCode} {row.phone}
                </td>

                <td className="px-4 py-3 text-[14px] font-bold text-[var(--primary500)]">
                  {money(row.balance)}
                </td>

                {showCommission ? (
                  <>
                    <td
                      className="px-4 py-3 text-[14px] font-semibold"
                      style={{
                        color:
                          due > 0
                            ? "var(--status-success)"
                            : due < 0
                              ? "var(--status-danger)"
                              : "var(--text-muted)",
                      }}
                    >
                      {money(due)}
                    </td>

                    <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">
                      R{row.referCommission || 0}% · D{row.depositCommission || 0}%
                      · W{row.gameWinCommission || 0}% · L
                      {row.gameLossCommission || 0}%
                    </td>
                  </>
                ) : (
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                    {row.referredBy?.userId || "—"}
                  </td>
                )}

                <td className="px-4 py-3 text-[13px] text-[var(--text-muted)]">
                  {new Date(row.createdAt).toLocaleDateString()}
                </td>

                <td className="px-4 py-3">
                  <StatusChip row={row} />
                </td>

                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onOpen(row)}
                    className="ad-btn ad-btn--ghost ad-btn--sm"
                  >
                    Open
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
