import { useMemo, useState } from "react";
import { Search, Heart, Users, Sparkles } from "lucide-react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { BirthdayMemberCard } from "./BirthdayMemberCard";
import { Input } from "@/components/ui/input";
import { useBirthdayFavorites } from "@/hooks/use-birthday-favorites";

import {
  TAB_KEYS,
  TAB_LABELS,
  getMembersForTab,
  getUpcomingGrouped,
  type BirthdayMember,
  type TabKey,
} from "@/data/birthday-members";

type SectionData = {
  key: "primary" | "secondary";
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  members: BirthdayMember[];
};

export function BirthdayMemberTabs() {
  const [active, setActive] = useState<TabKey>("upcoming");
  const [query, setQuery] = useState("");
  const { ids: favIds } = useBirthdayFavorites();

  const grouped = useMemo(() => getUpcomingGrouped(), []);
  const baseList = useMemo(
    () => getMembersForTab(active, favIds),
    [active, favIds],
  );

  const q = query.trim().toLowerCase();
  const matches = (m: BirthdayMember) =>
    !q ||
    m.name.toLowerCase().includes(q) ||
    m.nickname.toLowerCase().includes(q) ||
    m.team.toLowerCase().includes(q);

  const list = useMemo(() => baseList.filter(matches), [baseList, q]);
  const teamsList = useMemo(() => grouped.teams.filter(matches), [grouped, q]);
  const traineesList = useMemo(() => grouped.trainees.filter(matches), [grouped, q]);

  const isUpcoming = active === "upcoming";
  const totalCount = isUpcoming ? teamsList.length + traineesList.length : list.length;

  const sections: SectionData[] = isUpcoming
    ? [
        {
          key: "primary",
          title: "Member Love · Dream · Passion",
          subtitle: "5 member dengan ulang tahun terdekat",
          icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
          members: teamsList,
        },
        {
          key: "secondary",
          title: "Trainee",
          subtitle: "5 trainee dengan ulang tahun terdekat",
          icon: <Users className="h-4 w-4" aria-hidden="true" />,
          members: traineesList,
        },
      ]
    : [
        { key: "primary", members: list },
        { key: "secondary", members: [] },
      ];

  return (
    <section
      id="birthday-members"
      className="scroll-mt-header mx-auto max-w-6xl px-4 pb-20 sm:px-6"
    >
      {/* Tabs */}
      <LayoutGroup id="birthday-member-tabs">
        <div className="relative -mx-4 mb-8 sm:mx-0">
          <div className="scrollbar-none flex snap-x snap-mandatory items-center gap-1.5 overflow-x-auto scroll-px-4 px-4 sm:flex-wrap sm:snap-none sm:gap-2 sm:overflow-visible sm:px-0">
            {TAB_KEYS.map((key) => {
              const isActive = key === active;
              const isFavTab = key === "favorites";
              return (
                <div key={key} className="flex shrink-0 snap-start items-center gap-1.5 sm:gap-2">
                  {isFavTab && (
                    <span
                      aria-hidden="true"
                      className="mx-0.5 hidden h-6 w-px shrink-0 bg-border sm:block"
                    />
                  )}
                  <button
                    onClick={() => setActive(key)}
                    className={`relative shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm ${
                      isActive
                        ? "text-primary-foreground"
                        : isFavTab
                          ? "border border-primary/30 bg-primary/10 text-primary hover:border-primary/60"
                          : "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="birthday-active-tab-pill"
                        className="absolute inset-0 rounded-full bg-gradient-birthday shadow-birthday-glow"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative inline-flex items-center gap-1.5">
                      {isFavTab && (
                        <Heart
                          className={`h-3.5 w-3.5 shrink-0 ${isActive || favIds.length > 0 ? "fill-current" : ""}`}
                          aria-hidden="true"
                        />
                      )}
                      {TAB_LABELS[key]}
                      {isFavTab && favIds.length > 0 && (
                        <span
                          className={`ml-0.5 rounded-full px-1.5 text-[10px] font-bold ${
                            isActive
                              ? "bg-white/25 text-primary-foreground"
                              : "bg-primary/20 text-primary"
                          }`}
                        >
                          {favIds.length}
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
            {/* Spacer supaya pil terakhir tidak menempel di tepi layar saat di-scroll penuh */}
            <span aria-hidden="true" className="shrink-0 px-0.5 sm:hidden" />
          </div>
          {/* Petunjuk visual "masih ada tab lain" di ujung kanan — hanya mobile */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden"
          />
        </div>
      </LayoutGroup>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="text"
          placeholder="Cari member atau tim..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Konten: selalu 2 slot section yang sama, hanya isinya yang berubah */}
      <motion.div layout className="space-y-10">
        <AnimatePresence mode="popLayout" initial={false}>
          {sections.map((section) =>
            section.members.length === 0 ? null : (
              <BirthdaySection
                key={section.key}
                tabKey={active}
                data={section}
                favIds={favIds}
                isUpcoming={isUpcoming}
              />
            ),
          )}
        </AnimatePresence>
      </motion.div>

      {totalCount === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-16 text-center text-muted-foreground"
        >
          {active === "favorites"
            ? "Belum ada favorit. Tekan ikon hati pada kartu member untuk menyimpannya di sini."
            : "Tidak ada member yang cocok dengan pencarian."}
        </motion.p>
      )}
    </section>
  );
}

function BirthdaySection({
  tabKey,
  data,
  favIds,
  isUpcoming,
}: {
  tabKey: TabKey;
  data: SectionData;
  favIds: string[];
  isUpcoming: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {data.title && (
        <motion.div
          layout
          className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {data.icon}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black leading-snug tracking-tight text-foreground sm:text-lg">
                {data.title}
              </h2>
              <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                {data.subtitle}
              </p>
            </div>
          </div>
          <span className="ml-[42px] w-fit shrink-0 rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:ml-0">
            {data.members.length} Member
          </span>
        </motion.div>
      )}

      <motion.div
        layout
        className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        transition={{ layout: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {data.members.map((m, i) => (
            <motion.div
              key={`${tabKey}-${data.key}-${m.id}`}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{
                duration: 0.32,
                ease: [0.22, 1, 0.36, 1],
                delay: Math.min(i * 0.035, 0.25),
              }}
            >
              <BirthdayMemberCard
                member={m}
                rank={
                  isUpcoming
                    ? i + 1
                    : tabKey === "all" || tabKey === "favorites"
                      ? undefined
                      : i + 1
                }
                variant={isUpcoming ? "podium" : "default"}
                favoriteHighlight={isUpcoming && favIds.includes(m.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}