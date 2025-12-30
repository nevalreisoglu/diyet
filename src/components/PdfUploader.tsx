import { useRef } from 'react';
import { Upload, FileText, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomFoods } from '@/hooks/useCustomFoods';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PdfUploaderProps {
  userId: string | undefined;
}

export const PdfUploader = ({ userId }: PdfUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { customFoods, loading, uploading, uploadPdf, deleteCustomFood } = useCustomFoods(userId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      uploadPdf(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-card rounded-2xl p-5 border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Yiyecek listesi içeren PDF yükleyin
            </p>
          </div>
        </div>
        <div className="sm:ml-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !userId}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                PDF İşleniyor...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                PDF Yükle
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : customFoods.length > 0 ? (
        <ScrollArea className="h-48">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {customFoods.map((food) => (
              <div
                key={food.id}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{food.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {food.calories} kcal
                    {food.protein && ` • P: ${food.protein}g`}
                    {food.carbs && ` • K: ${food.carbs}g`}
                    {food.fat && ` • Y: ${food.fat}g`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteCustomFood(food.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8 bg-secondary/30 rounded-xl">
          <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Henüz yiyecek listesi yüklenmemiş
          </p>
        </div>
      )}
    </div>
  );
};
