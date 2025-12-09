import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Pen, Trash2, Circle, Square, Minus, Triangle, MoveRight, Star, Hexagon, Pentagon, Octagon, Diamond, Heart, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface SketchEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const DEFAULT_COLORS = [
  '#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB',
];

const BRUSH_SIZES = [2, 5, 10, 15];

const loadCustomColors = (): string[] => {
  try {
    const saved = localStorage.getItem('sketch-custom-colors');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveCustomColors = (colors: string[]) => {
  try {
    localStorage.setItem('sketch-custom-colors', JSON.stringify(colors));
  } catch (error) {
    console.error('Failed to save custom colors:', error);
  }
};

export const SketchEditor = ({ content, onChange }: SketchEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'triangle' | 'arrow' | 'star' | 'hexagon' | 'pentagon' | 'octagon' | 'diamond' | 'heart'>('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [tempCanvas, setTempCanvas] = useState<ImageData | null>(null);
  const [customColors, setCustomColors] = useState<string[]>(loadCustomColors());
  const [newColor, setNewColor] = useState('#000000');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    if (content) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = content;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
  }, [content]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    setLastPos({ x, y });
    setStartPos({ x, y });

    if (tool !== 'pen' && tool !== 'eraser') {
      setTempCanvas(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos || !startPos) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = tool === 'pen' ? color : '#ffffff';
      ctx.lineWidth = tool === 'pen' ? brushSize : brushSize * 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      setLastPos({ x, y });
    } else {
      if (tempCanvas) {
        ctx.putImageData(tempCanvas, 0, 0);
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';

      if (tool === 'rectangle') {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (tool === 'triangle') {
        const width = x - startPos.x;
        const height = y - startPos.y;
        ctx.beginPath();
        ctx.moveTo(startPos.x + width / 2, startPos.y);
        ctx.lineTo(startPos.x, startPos.y + height);
        ctx.lineTo(startPos.x + width, startPos.y + height);
        ctx.closePath();
        ctx.stroke();
      } else if (tool === 'arrow') {
        const headlen = 15;
        const angle = Math.atan2(y - startPos.y, x - startPos.x);
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x, y);
        ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (tool === 'star') {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        const spikes = 5;
        const outerRadius = radius;
        const innerRadius = radius / 2;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const currentRadius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const xPos = startPos.x + currentRadius * Math.cos(angle);
          const yPos = startPos.y + currentRadius * Math.sin(angle);
          if (i === 0) ctx.moveTo(xPos, yPos);
          else ctx.lineTo(xPos, yPos);
        }
        ctx.closePath();
        ctx.stroke();
      } else if (tool === 'hexagon') {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
          const xPos = startPos.x + radius * Math.cos(angle);
          const yPos = startPos.y + radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(xPos, yPos);
          else ctx.lineTo(xPos, yPos);
        }
        ctx.closePath();
        ctx.stroke();
      } else if (tool === 'pentagon') {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const xPos = startPos.x + radius * Math.cos(angle);
          const yPos = startPos.y + radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(xPos, yPos);
          else ctx.lineTo(xPos, yPos);
        }
        ctx.closePath();
        ctx.stroke();
      } else if (tool === 'octagon') {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * 2 * Math.PI) / 8 - Math.PI / 2;
          const xPos = startPos.x + radius * Math.cos(angle);
          const yPos = startPos.y + radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(xPos, yPos);
          else ctx.lineTo(xPos, yPos);
        }
        ctx.closePath();
        ctx.stroke();
      } else if (tool === 'diamond') {
        const width = x - startPos.x;
        const height = y - startPos.y;
        ctx.beginPath();
        ctx.moveTo(startPos.x + width / 2, startPos.y);
        ctx.lineTo(startPos.x + width, startPos.y + height / 2);
        ctx.lineTo(startPos.x + width / 2, startPos.y + height);
        ctx.lineTo(startPos.x, startPos.y + height / 2);
        ctx.closePath();
        ctx.stroke();
      } else if (tool === 'heart') {
        const width = x - startPos.x;
        const height = y - startPos.y;
        ctx.beginPath();
        const topCurveHeight = height * 0.3;
        ctx.moveTo(startPos.x + width / 2, startPos.y + topCurveHeight);
        ctx.bezierCurveTo(startPos.x + width / 2, startPos.y, startPos.x, startPos.y, startPos.x, startPos.y + topCurveHeight);
        ctx.bezierCurveTo(startPos.x, startPos.y + (height + topCurveHeight) / 2, startPos.x + width / 2, startPos.y + (height + topCurveHeight) / 2, startPos.x + width / 2, startPos.y + height);
        ctx.bezierCurveTo(startPos.x + width / 2, startPos.y + (height + topCurveHeight) / 2, startPos.x + width, startPos.y + (height + topCurveHeight) / 2, startPos.x + width, startPos.y + topCurveHeight);
        ctx.bezierCurveTo(startPos.x + width, startPos.y, startPos.x + width / 2, startPos.y, startPos.x + width / 2, startPos.y + topCurveHeight);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        onChange(canvas.toDataURL());
      }
    }
    setIsDrawing(false);
    setLastPos(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange(canvas.toDataURL());
  };

  const addCustomColor = () => {
    if (!newColor || customColors.includes(newColor)) {
      toast.error('Color already exists or invalid');
      return;
    }
    const updatedColors = [...customColors, newColor];
    setCustomColors(updatedColors);
    saveCustomColors(updatedColors);
    setColor(newColor);
    toast.success('Custom color added!');
  };

  const removeCustomColor = (colorToRemove: string) => {
    const updatedColors = customColors.filter(c => c !== colorToRemove);
    setCustomColors(updatedColors);
    saveCustomColors(updatedColors);
    toast.success('Color removed');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex flex-col gap-3 p-4 border-b">
        {/* Tool Selection */}
        <div className="flex gap-2 flex-wrap">
          <Button variant={tool === 'pen' ? 'default' : 'outline'} size="icon" onClick={() => setTool('pen')} title="Pen"><Pen className="h-4 w-4" /></Button>
          <Button variant={tool === 'eraser' ? 'default' : 'outline'} size="icon" onClick={() => setTool('eraser')} title="Eraser"><Eraser className="h-4 w-4" /></Button>
          <Button variant={tool === 'rectangle' ? 'default' : 'outline'} size="icon" onClick={() => setTool('rectangle')} title="Rectangle"><Square className="h-4 w-4" /></Button>
          <Button variant={tool === 'circle' ? 'default' : 'outline'} size="icon" onClick={() => setTool('circle')} title="Circle"><Circle className="h-4 w-4" /></Button>
          <Button variant={tool === 'line' ? 'default' : 'outline'} size="icon" onClick={() => setTool('line')} title="Line"><Minus className="h-4 w-4" /></Button>
          <Button variant={tool === 'triangle' ? 'default' : 'outline'} size="icon" onClick={() => setTool('triangle')} title="Triangle"><Triangle className="h-4 w-4" /></Button>
          <Button variant={tool === 'arrow' ? 'default' : 'outline'} size="icon" onClick={() => setTool('arrow')} title="Arrow"><MoveRight className="h-4 w-4" /></Button>
          <Button variant={tool === 'star' ? 'default' : 'outline'} size="icon" onClick={() => setTool('star')} title="Star"><Star className="h-4 w-4" /></Button>
          <Button variant={tool === 'hexagon' ? 'default' : 'outline'} size="icon" onClick={() => setTool('hexagon')} title="Hexagon"><Hexagon className="h-4 w-4" /></Button>
          <Button variant={tool === 'pentagon' ? 'default' : 'outline'} size="icon" onClick={() => setTool('pentagon')} title="Pentagon"><Pentagon className="h-4 w-4" /></Button>
          <Button variant={tool === 'octagon' ? 'default' : 'outline'} size="icon" onClick={() => setTool('octagon')} title="Octagon"><Octagon className="h-4 w-4" /></Button>
          <Button variant={tool === 'diamond' ? 'default' : 'outline'} size="icon" onClick={() => setTool('diamond')} title="Diamond"><Diamond className="h-4 w-4" /></Button>
          <Button variant={tool === 'heart' ? 'default' : 'outline'} size="icon" onClick={() => setTool('heart')} title="Heart"><Heart className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={clearCanvas} title="Clear All"><Trash2 className="h-4 w-4" /></Button>
        </div>

        {/* Color Selection */}
        {tool !== 'eraser' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Colors:</span>
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn("h-8 w-8 rounded-full border-2 transition-all", c === color ? "ring-2 ring-primary scale-110" : "ring-0")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {customColors.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Custom:</span>
                {customColors.map((c) => (
                  <div key={c} className="relative group">
                    <button
                      onClick={() => setColor(c)}
                      className={cn("h-8 w-8 rounded-full border-2 transition-all", c === color ? "ring-2 ring-primary scale-110" : "ring-0")}
                      style={{ backgroundColor: c }}
                    />
                    <button
                      onClick={() => removeCustomColor(c)}
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-16 h-8 p-1 cursor-pointer" />
              <Button onClick={addCustomColor} size="sm" variant="outline" className="h-8">
                <Plus className="h-4 w-4 mr-1" />Add Color
              </Button>
            </div>
          </div>
        )}

        {/* Brush Size */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium mr-2">Size:</span>
          {BRUSH_SIZES.map((size) => (
            <Button key={size} variant={brushSize === size ? 'default' : 'outline'} size="sm" onClick={() => setBrushSize(size)} className="h-8 w-10">
              <Circle className="h-3 w-3" style={{ width: `${size + 4}px`, height: `${size + 4}px` }} fill="currentColor" />
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto" style={{ minHeight: '600px' }}>
        <canvas
          ref={canvasRef}
          className="w-full border border-border rounded-lg bg-white cursor-crosshair touch-none"
          style={{ height: '600px' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  );
};
