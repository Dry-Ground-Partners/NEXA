# 🎨 Canvas Layout - Before & After

## **BEFORE** (Old Layout)

```
┌─────────────────────────────────────────────────────────────┐
│                     Full Screen Modal                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                Modal Header (Controls)                │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │   ┌─────────────────────┐  ┌─────────────────────┐   │  │
│  │   │                     │  │                     │   │  │
│  │   │   PDF Preview       │  │   ChatInterface     │   │  │
│  │   │   (75% width)       │  │   (25% width)       │   │  │
│  │   │                     │  │   - Quickshot       │   │  │
│  │   │                     │  │   - Messages        │   │  │
│  │   │                     │  │   - Input           │   │  │
│  │   │                     │  │                     │   │  │
│  │   └─────────────────────┘  └─────────────────────┘   │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Issues:**
- ❌ Redundant chat interface (duplicates Liaison)
- ❌ PDF preview squished to 75% width
- ❌ No space for Liaison sidebar
- ❌ Modal centered, doesn't account for sidebar

---

## **AFTER** (New Layout)

```
┌──────────────────────────────────────────┬──────────────────┐
│         Canvas Modal                     │  Liaison Sidebar │
│  ┌────────────────────────────────────┐  │  (384px / w-96)  │
│  │   Modal Header (Controls)          │  │                  │
│  ├────────────────────────────────────┤  │  ┌────────────┐  │
│  │                                    │  │  │   Hidden   │  │
│  │   ┌────────────────────────────┐   │  │  │   Pre-Res  │  │
│  │   │                            │   │  │  │   Response │  │
│  │   │   PDF Preview              │   │  │  │   Logs     │  │
│  │   │   (100% width)             │   │  │  │            │  │
│  │   │                            │   │  │  │   Input    │  │
│  │   │   - Full document view     │   │  │  └────────────┘  │
│  │   │   - More space             │   │  │                  │
│  │   │   - Better readability     │   │  │  (Ready for     │
│  │   │                            │   │  │   Maestro       │
│  │   │                            │   │  │   actions!)     │
│  │   └────────────────────────────┘   │  │                  │
│  │                                    │  │                  │
│  └────────────────────────────────────┘  │                  │
│                                          │                  │
└──────────────────────────────────────────┴──────────────────┘
```

**Improvements:**
- ✅ PDF preview at full width (better readability)
- ✅ Space allocated for Liaison sidebar
- ✅ Modal positioned: `fixed top-0 bottom-0 left-0 right-96`
- ✅ Clean separation of concerns:
  - **Canvas Modal** = Document viewing/editing
  - **Liaison Sidebar** = AI conversation/actions
- ✅ Ready for action integration

---

## **Key Layout Values**

| Element | Old | New | Notes |
|---------|-----|-----|-------|
| **Modal Position** | `inset-0` with padding | `top-0 bottom-0 left-0 right-96` | Accounts for sidebar |
| **PDF Width** | `w-3/4` (75%) | `100%` | Full width available |
| **Chat** | Embedded (25%) | Removed | Will use Liaison |
| **Sidebar Space** | None | `384px` (`right-96`) | Reserved for Liaison |
| **Backdrop** | Full screen | Full screen | Unchanged |
| **Z-Index** | Modal: `z-50` | Modal: `z-50`, Sidebar: `z-40` | Proper layering |

---

## **Positioning Breakdown**

### **Sidebar Width Calculation:**
```
Tailwind class: w-96
Pixels: 384px (24 * 16px)
CSS: width: 24rem
```

### **Modal Right Edge:**
```
Tailwind class: right-96
Effect: Modal stops 384px from right edge
Result: Perfect space for sidebar
```

### **Visual Formula:**
```
Screen Width = Modal Width + Sidebar Width
100%         = (100% - 384px) + 384px
             = Canvas Modal  + Liaison
```

---

## **Interaction Flow**

### **User opens Canvas:**
1. Click "Hyper-Canvas" button on Solutioning page
2. `openHyperCanvas()` called
3. `showHyperCanvas` set to `true`
4. `generatePreviewBlob()` triggered
5. Modal renders: `left-0` to `right-96`
6. Sidebar space: `right-96` to `right-0` (available for Liaison)

### **User interacts with Canvas:**
- **Refresh:** Re-generates PDF blob
- **Download:** Exports to file
- **Save:** Persists session
- **Close:** Revokes blob, closes modal

### **Future: User triggers Maestro action via Liaison:**
1. User types in Liaison sidebar (right side)
2. Liaison detects action (e.g., "make it blue")
3. Maestro called (async)
4. PDF updates in Canvas modal (left side)
5. User sees real-time preview

---

## **CSS Structure**

### **Backdrop:**
```typescript
<div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
  {/* Takes full screen */}
  {/* Provides blur effect behind modal */}
</div>
```

### **Modal Container:**
```typescript
<div className="fixed top-0 bottom-0 left-0 right-96 bg-white/10 backdrop-blur-xl border-r border-white/20 shadow-2xl overflow-hidden">
  {/* Positioned from left edge to 384px from right */}
  {/* Border on right to separate from sidebar space */}
</div>
```

### **PDF Container:**
```typescript
<div className="h-[calc(100%-4rem)] bg-white/5 backdrop-blur-sm">
  {/* Full height minus header (4rem = 64px) */}
  <div className="flex-1 ... overflow-hidden">
    <iframe src={previewBlob} className="w-full h-full border-0" />
    {/* Full width and height iframe */}
  </div>
</div>
```

---

## **Responsive Behavior**

### **Current:**
- Modal takes `right-96` (384px) for sidebar
- Works on screens > 1200px width

### **Future Considerations:**
- Mobile: May need to stack (modal full-screen, sidebar slides over)
- Tablet: May reduce sidebar to `w-80` (320px)
- Large screens: Current layout perfect

---

**Status:** ✅ Layout optimized and ready for Liaison integration!

