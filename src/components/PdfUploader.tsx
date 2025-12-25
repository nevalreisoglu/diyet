import { useRef } from 'react';
import { Upload, FileText, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Yiyecek Listem
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full"
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
          <p className="text-xs text-muted-foreground mt-2">
            Yiyecek listesi içeren PDF yükleyin
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : customFoods.length > 0 ? (
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {customFoods.map((food) => (
                <div
                  key={food.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
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
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteCustomFood(food.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Henüz yiyecek listesi yüklenmemiş
          </p>
        )}
      </CardContent>
    </Card>
  );
};
