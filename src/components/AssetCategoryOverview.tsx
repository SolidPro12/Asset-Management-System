import { Laptop, Monitor, Keyboard, MousePointer, Headphones, Printer, Smartphone, Tablet, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CategoryCount {
  category: string;
  count: number;
  icon: React.ReactNode;
  label: string;
}

interface AssetCategoryOverviewProps {
  assets: any[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

const categoryIcons = {
  laptop: { icon: Laptop, label: 'Laptops' },
  desktop: { icon: Monitor, label: 'Desktops' },
  monitor: { icon: Monitor, label: 'Monitors' },
  keyboard: { icon: Keyboard, label: 'Keyboards' },
  mouse: { icon: MousePointer, label: 'Mice' },
  headset: { icon: Headphones, label: 'Headsets' },
  printer: { icon: Printer, label: 'Printers' },
  phone: { icon: Smartphone, label: 'Phones' },
  tablet: { icon: Tablet, label: 'Tablets' },
  other: { icon: Package, label: 'Other' },
};

export const AssetCategoryOverview = ({ assets, selectedCategory, onCategorySelect }: AssetCategoryOverviewProps) => {
  // Calculate counts for each category
  const categoryCounts: CategoryCount[] = Object.entries(categoryIcons).map(([category, { icon: Icon, label }]) => {
    const count = assets.filter(asset => asset.category === category).length;
    return {
      category,
      count,
      icon: <Icon className="w-12 h-12" />,
      label,
    };
  }).filter(item => item.count > 0); // Only show categories with assets

  return (
    <Card className="mb-6">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Asset Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {categoryCounts.map(({ category, count, icon, label }) => (
            <button
              key={category}
              onClick={() => onCategorySelect(category === selectedCategory ? 'all' : category)}
              className={cn(
                "flex flex-col items-center p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer",
                category === selectedCategory
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "mb-2 transition-colors",
                category === selectedCategory ? "text-primary" : "text-muted-foreground"
              )}>
                {icon}
              </div>
              <span className="text-sm font-medium text-center text-foreground">{label}</span>
              <span className={cn(
                "text-2xl font-bold mt-1",
                category === selectedCategory ? "text-primary" : "text-foreground"
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};
