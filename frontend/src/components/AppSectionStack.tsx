import AppSectionRail, {
  type AppSectionRailItem,
} from "./AppSectionRail";
import { MataponiLoaderEasterEgg } from "./feedback/MataponiLoaderEasterEgg";

type Props = {
  items: AppSectionRailItem[];
  label?: string;
};

export default function AppSectionStack({
  items,
  label,
}: Props) {
  return (
    <div className="app-section-stack">
      <AppSectionRail
        items={items}
        label={label}
      />

      <MataponiLoaderEasterEgg />
    </div>
  );
}
