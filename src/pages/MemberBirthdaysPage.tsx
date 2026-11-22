import { BirthdayHero } from "@/components/birthday/BirthdayHero";
import { BirthdayMemberTabs } from "@/components/birthday/BirthdayMemberTabs";

export default function MemberBirthdaysPage() {
  return (
    <div className="bg-background text-foreground">
      <BirthdayHero />
      <BirthdayMemberTabs />
    </div>
  );
}