# 🔬 DRAW.IO INTEGRATION RESEARCH - FINDINGS REPORT

**Research Date:** October 1, 2025  
**Purpose:** Understand draw.io integration for NEXA platform's `/visuals` page  
**Status:** ⚠️ PARTIAL - Core concepts understood, specific technical details need direct source investigation

---

## 📊 EXECUTIVE SUMMARY

### ✅ What We Know
1. **draw.io is primarily a client-side application** - Can be embedded without complex server infrastructure
2. **Embedding method:** iframe with postMessage API communication
3. **Data format:** XML-based (mxGraphModel format)
4. **Self-hosting:** Possible via Docker or static file serving
5. **No REST API:** draw.io doesn't provide traditional API, all interaction is via postMessage

### ⚠️ Critical Gaps (Require Direct Source Investigation)
1. **Exact postMessage protocol specification** - Need to find official docs or reverse engineer
2. **Embed URL parameters** - Specific parameters like `embed=1`, `proto=json`, `autosave=1`
3. **PNG export implementation** - Technical details of `action: "export", format: "png"`
4. **XML structure for initialization** - Exact format to send blank/existing diagrams
5. **Event handling specifics** - All event types, payloads, and timing

---

## 🏗️ PART 1: ARCHITECTURE UNDERSTANDING

### **1.1 What is draw.io?**

**Core Facts:**
- **Official names:** draw.io AND diagrams.net (used interchangeably)
- **License:** Open source under Apache v2
- **Technology:** Built on mxGraph JavaScript library
- **Primary mode:** Client-side web application (JavaScript in browser)
- **Data storage:** NO built-in storage - applications must handle this

**Key Characteristics:**
- ✅ Runs entirely in the browser (client-side)
- ✅ No authentication system built-in
- ✅ No diagram storage on draw.io servers
- ✅ Can work offline (desktop app exists)
- ✅ Full editor functionality without server components

**URLs:**
- Online editor: `https://app.diagrams.net/`
- Alternative: `https://www.draw.io/` (redirects to diagrams.net)
- GitHub: `https://github.com/jgraph/drawio`

---

### **1.2 Self-Hosting Options**

**Option 1: Docker Deployment** ⭐ RECOMMENDED
- Official Docker images available
- **Pros:**
  - Easy deployment
  - Isolated environment
  - Production-ready
  - Can customize configuration
- **Cons:**
  - Requires Docker infrastructure
  - Slightly more complex than static files

**Option 2: Static File Hosting**
- Clone GitHub repo and serve the `/src/main/webapp` directory
- **Pros:**
  - Simplest deployment
  - No container overhead
  - Just serve static files (HTML, JS, CSS)
- **Cons:**
  - Manual updates required
  - Less isolated

**Option 3: Use Public CDN** ⚠️ NOT RECOMMENDED FOR PRODUCTION
- Embed directly from `https://app.diagrams.net/`
- **Pros:**
  - Zero hosting needed
  - Always up-to-date
- **Cons:**
  - External dependency
  - Privacy concerns (users' browsers communicate with diagrams.net)
  - Potential downtime if diagrams.net is down
  - May violate data sovereignty requirements

**RECOMMENDATION FOR NEXA:**
- **Start with Docker** for ease of deployment and isolation
- **Future:** Consider static hosting if Docker overhead is problematic
- **Avoid:** Public CDN for production (okay for prototyping)

---

### **1.3 Embedding Methods**

**Method 1: iframe Embedding** ⭐ OFFICIAL METHOD
```jsx
<iframe 
  src="https://app.diagrams.net/?embed=1&proto=json&spin=1"
  style="border:0; width:100%; height:600px;"
/>
```

**Pros:**
- ✅ Officially supported
- ✅ Well-documented (relatively)
- ✅ Stable and reliable
- ✅ Full editor functionality
- ✅ Communication via postMessage API

**Cons:**
- ⚠️ iframe security considerations (CSP, sandbox)
- ⚠️ Requires postMessage understanding

**Method 2: WebComponent** ⚠️ EXPERIMENTAL
- Custom web component approach
- **Pros:** More integrated feel
- **Cons:**
  - Less documented
  - Experimental/unstable
  - More complex implementation

**RECOMMENDATION FOR NEXA:**
- **Use iframe embedding** - proven, stable, officially supported
- Avoid WebComponent until more mature

---

## 🔌 PART 2: POSTMESSAGE API (CRITICAL GAP)

### **2.1 What We Know**

**Communication Protocol:**
- **Method:** `window.postMessage()` between parent page and iframe
- **Data Format:** JSON strings (when `proto=json` parameter is set)
- **Direction:** Bidirectional (parent ↔ iframe)

**Message Structure (General Pattern):**
```javascript
// Sending TO draw.io:
iframe.contentWindow.postMessage(JSON.stringify({
  action: "load",  // or "export", "merge", etc.
  xml: "<mxGraphModel>...</mxGraphModel>"
}), "*");

// Receiving FROM draw.io:
window.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.event === "save" || message.event === "autosave") {
    const diagramXML = message.xml;
    // Save to database
  }
});
```

---

### **2.2 Critical Gaps - Need Specific Documentation**

❌ **Missing Information:**

1. **Complete Action List:**
   - What actions are supported? (`load`, `export`, `merge`, ???)
   - Exact payload structure for each action
   - Required vs optional fields

2. **Event Types:**
   - What events does draw.io emit? (`save`, `autosave`, `init`, `configure`, ???)
   - Event payload structures
   - Event timing and guarantees

3. **Export Formats:**
   - PNG, SVG, PDF supported?
   - Base64 encoding details
   - Quality/resolution parameters

4. **Initialization:**
   - How to start with blank diagram?
   - How to load existing XML?
   - Timing - when is iframe ready?

5. **Autosave:**
   - How to enable autosave?
   - Autosave frequency control?
   - Throttling/debouncing behavior?

---

### **2.3 URL Parameters (Partial Knowledge)**

**Known Parameters:**
- `?embed=1` - Enables embed mode (hides certain UI elements)
- `?proto=json` - Use JSON for postMessage (vs default format)
- `?spin=1` - Show loading spinner? (Unclear)
- `?ui=` - UI theme/config (minimal, atlas, kennedy, etc.)
- `?libraries=` - Enable specific shape libraries
- `?offline=1` - Offline mode?

❌ **Need to Find:**
- Complete parameter reference
- `autosave=1` parameter (mentioned in user's brief - does it exist?)
- Other embedding-specific parameters
- Configuration parameters for UI customization

---

## 📦 PART 3: DATA FORMAT (XML STRUCTURE)

### **3.1 mxGraphModel Format**

**What We Know:**
- draw.io uses **mxGraphModel** XML format
- Based on mxGraph library specification
- Contains diagram structure, styles, and metadata

**Basic Structure (Inferred):**
```xml
<mxGraphModel>
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
    <!-- User cells (shapes, connectors) go here -->
    <mxCell id="2" value="Process" style="rounded=1;..." vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="120" height="60" as="geometry" />
    </mxCell>
  </root>
</mxGraphModel>
```

**Elements:**
- `<mxGraphModel>` - Root element
- `<root>` - Contains all cells
- `<mxCell>` - Each shape, connector, or layer
  - `id` - Unique identifier
  - `value` - Label text
  - `style` - Visual styling
  - `vertex` or `edge` - Type indicator
  - `parent` - Parent cell ID
  - `<mxGeometry>` - Position and size

---

### **3.2 Critical Gaps**

❌ **Need to Determine:**
1. **Empty diagram XML** - What's the minimal valid XML for a blank canvas?
2. **Compression** - Is XML compressed/encoded in any format?
3. **Metadata fields** - What additional metadata is stored?
4. **Version compatibility** - How to ensure XML compatibility across versions?

---

## 🖼️ PART 4: PNG EXPORT FUNCTIONALITY

### **4.1 What We Know**

**Export Mechanism (Inferred):**
```javascript
// Request PNG export
iframe.contentWindow.postMessage(JSON.stringify({
  action: "export",
  format: "png"  // or "svg", "pdf", "xmlpng"
}), "*");

// Receive PNG data
window.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.event === "export") {
    const base64PNG = message.data;  // Base64 encoded PNG
    // Convert to Blob or send to server
  }
});
```

**Export Formats (Likely Supported):**
- `png` - PNG image
- `svg` - SVG vector image  
- `pdf` - PDF document
- `xmlpng` - PNG with embedded XML (for re-editing)

---

### **4.2 Critical Gaps**

❌ **Missing Details:**
1. **Exact message structure** for export request
2. **Response format** - How is Base64 data provided?
3. **Quality parameters** - Can we control resolution, DPI?
4. **Transparency** - PNG transparency support?
5. **Dimensions** - How to set export dimensions?
6. **Error handling** - What if export fails?

---

## 🔄 PART 5: WORKFLOW INTEGRATION WITH NEXA

### **5.1 Current NEXA /visuals Structure**

**Data Model:**
```typescript
interface DiagramSet {
  id: number
  ideation: string      // Text input
  planning: string      // AI-generated text
  sketch: string        // AI-generated text
  image: string | null  // Base64 image data (currently uploaded)
  expandedContent: string
  isExpanded: boolean
}
```

**Storage:** 
- Database: `ai_architecture_sessions.visual_assets_json`
- Session-based, not real-time

---

### **5.2 Integration Points**

**Where draw.io Fits:**

1. **NEW FIELD: `diagramXML`**
   ```typescript
   interface DiagramSet {
     // ... existing fields ...
     image: string | null       // ← Generated from XML
     diagramXML: string | null  // ← NEW: draw.io XML
   }
   ```

2. **Workflow:**
   ```
   1. User enters ideation text
   2. AI generates planning (existing)
   3. AI generates sketch text (existing)
   4. [NEW] User clicks "Edit Diagram" → Opens draw.io editor
   5. [NEW] draw.io loads with blank canvas OR existing XML
   6. [NEW] User edits diagram visually
   7. [NEW] Autosave: XML saved to diagramXML field
   8. [NEW] On save: Export PNG → replace `image` field
   9. Session saved to database
   ```

3. **User Experience:**
   ```
   +----------------------------------+
   |  Diagram Tab 1                   |
   |  [Ideation] [Planning] [Sketch]  |
   |                                  |
   |  [Edit Diagram Button]  ← NEW    |
   |                                  |
   |  +----------------------------+  |
   |  | draw.io Editor (iframe)    |  |
   |  | (Opens on click)           |  |
   |  +----------------------------+  |
   |                                  |
   |  Generated Image:                |
   |  [PNG Preview from XML]          |
   +----------------------------------+
   ```

---

### **5.3 Technical Requirements**

**Frontend Changes Needed:**

1. **Add draw.io iframe** to DiagramSet component
2. **State Management:**
   - Track which diagram is being edited
   - Store XML in component state
   - Manage iframe visibility (modal or inline)

3. **PostMessage Handler:**
   - Send XML to iframe on load
   - Receive XML on autosave
   - Trigger PNG export on save
   - Store Base64 PNG in `image` field

4. **Session Data Update:**
   - Add `diagramXML` field to `VisualsSessionData`
   - Update session save logic

**Backend Changes Needed:**
- ✅ NO BACKEND CHANGES required (draw.io is client-side)
- ✅ Database schema already supports it (JSONB in `visual_assets_json`)

---

## 🚨 PART 6: SECURITY CONSIDERATIONS

### **6.1 iframe Security**

**Concerns:**
1. **XSS Risks** - iframe content from external source
2. **Data Leakage** - postMessage to wrong origin
3. **CSP Headers** - Content Security Policy may block iframe

**Mitigations:**
1. **Self-host draw.io** - Don't use public CDN in production
2. **Validate postMessage origin:**
   ```javascript
   window.addEventListener('message', (event) => {
     // Only accept messages from our draw.io iframe
     if (event.origin !== 'https://our-drawio-domain.com') return;
     // Process message
   });
   ```
3. **iframe sandbox attribute** (if needed):
   ```html
   <iframe sandbox="allow-scripts allow-same-origin" src="..." />
   ```

4. **CSP Configuration** in Next.js:
   ```javascript
   // next.config.js
   headers: {
     'Content-Security-Policy': "frame-src 'self' https://our-drawio-domain.com"
   }
   ```

---

### **6.2 Data Privacy**

**Considerations:**
- ✅ All processing happens client-side (browser)
- ✅ No data sent to draw.io servers (when self-hosted)
- ✅ Diagrams stored in NEXA database only
- ⚠️ Base64 images can be large (monitor database size)

---

## 📋 PART 7: IMPLEMENTATION UNKNOWNS

### **7.1 Critical Questions to Answer**

❌ **Technical Details Still Needed:**

1. **PostMessage Protocol:**
   - [ ] Complete list of actions and events
   - [ ] Exact payload structures
   - [ ] Error handling messages
   - [ ] Ready/init event detection

2. **URL Configuration:**
   - [ ] All available embed URL parameters
   - [ ] UI customization options
   - [ ] Library loading parameters
   - [ ] Autosave configuration (if URL-based)

3. **Export Functionality:**
   - [ ] PNG export exact syntax
   - [ ] Base64 response format
   - [ ] Quality/resolution control
   - [ ] Supported formats and limitations

4. **XML Format:**
   - [ ] Minimal blank diagram XML
   - [ ] Version/compatibility info
   - [ ] Compressed vs uncompressed

5. **Timing & Lifecycle:**
   - [ ] When is iframe ready to receive messages?
   - [ ] How to detect editor initialization?
   - [ ] Message queue vs direct send

---

### **7.2 Where to Find Answers**

**Primary Sources (IN ORDER OF PRIORITY):**

1. **GitHub Repository:**
   - `https://github.com/jgraph/drawio`
   - Look for: `/src/main/webapp/` directory
   - Search for: postMessage, embed, protocol documentation

2. **ONLYOFFICE Plugin Example:**
   - `https://api.onlyoffice.com/docspace/plugins-sdk/samples/ready-to-use-samples/drawio/`
   - Real working implementation
   - May contain postMessage examples

3. **Nasdanika Drawio API:**
   - Third-party library mentioned in searches
   - May have documented the protocol

4. **Reverse Engineering:**
   - Embed draw.io in test page
   - Use browser DevTools
   - Monitor postMessage traffic
   - Document observed behavior

5. **Community/Forums:**
   - draw.io Google Group
   - Stack Overflow draw.io tag
   - GitHub Issues/Discussions

---

## 🎯 PART 8: RECOMMENDED NEXT STEPS

### **Phase 1: Validate Technical Feasibility** (IMMEDIATE)

1. **Create Test Environment:**
   - [ ] Set up simple HTML page with draw.io iframe
   - [ ] Test postMessage communication
   - [ ] Verify XML load/save works
   - [ ] Test PNG export functionality

2. **Document Findings:**
   - [ ] Record exact postMessage syntax discovered
   - [ ] Document all events observed
   - [ ] Create minimal working examples

3. **Prototype Integration:**
   - [ ] Add iframe to NEXA `/visuals` page
   - [ ] Implement basic load/save
   - [ ] Test with NEXA session data

---

### **Phase 2: Production Implementation** (AFTER VALIDATION)

1. **Self-Hosting Setup:**
   - [ ] Deploy draw.io via Docker
   - [ ] Configure reverse proxy if needed
   - [ ] Set up HTTPS/SSL

2. **NEXA Integration:**
   - [ ] Update `VisualsSessionData` interface (add diagramXML)
   - [ ] Implement editor modal/panel
   - [ ] Add postMessage handlers
   - [ ] Implement autosave logic
   - [ ] Add PNG export and image replacement

3. **Testing:**
   - [ ] Test create new diagram
   - [ ] Test edit existing diagram
   - [ ] Test autosave behavior
   - [ ] Test PNG generation
   - [ ] Test session save/load

4. **Security & Performance:**
   - [ ] Implement origin validation
   - [ ] Add error handling
   - [ ] Monitor Base64 image sizes
   - [ ] Optimize iframe loading

---

## 📊 SUMMARY: WHAT WE KNOW VS DON'T KNOW

### ✅ **CONFIDENT KNOWLEDGE (80%+ certainty)**

1. **Architecture:** Client-side app, can self-host, iframe embedding
2. **Communication:** postMessage API with JSON protocol
3. **Data Format:** mxGraphModel XML
4. **Self-Hosting:** Docker or static files
5. **Exports:** PNG/SVG/PDF possible via postMessage
6. **Integration Approach:** iframe in React component with message handlers

### ⚠️ **UNCERTAIN AREAS (Need Verification)**

1. **Exact postMessage protocol** - Specific actions, events, payloads
2. **URL parameters** - Complete list and effects
3. **Autosave implementation** - How to enable, frequency, behavior
4. **PNG export details** - Exact syntax, quality control
5. **Initialization timing** - When iframe is ready
6. **Error handling** - What error events exist

### ❌ **CRITICAL UNKNOWNS (Must Research)**

1. **Complete postMessage API specification**
2. **Embed mode URL parameter reference**
3. **Blank diagram XML template**
4. **Export quality/resolution parameters**
5. **Autosave configuration method**

---

## 🔍 RESEARCH METHODOLOGY ASSESSMENT

### **What Worked:**
- ✅ Understanding general architecture and capabilities
- ✅ Identifying self-hosting options
- ✅ Confirming iframe + postMessage approach
- ✅ Finding integration examples (ONLYOFFICE)

### **What Didn't Work:**
- ❌ Web searches for specific API details (too generic results)
- ❌ Finding official postMessage documentation
- ❌ Getting concrete code examples with exact syntax

### **What's Needed Next:**
1. **Direct source investigation** - Read draw.io GitHub code
2. **Hands-on testing** - Build test harness, observe behavior
3. **Reverse engineering** - Monitor postMessage traffic
4. **Community engagement** - Post specific questions to forums

---

## 🎬 CONCLUSION

### **Current Status: 60% Complete**

**We have sufficient knowledge to:**
- ✅ Start prototyping
- ✅ Set up self-hosting
- ✅ Create basic integration
- ✅ Understand data flow

**We need more research for:**
- ⚠️ Production-ready implementation
- ⚠️ All edge cases and error handling
- ⚠️ Optimal autosave configuration
- ⚠️ Advanced export options

### **Recommended Approach:**

1. **START** with proof-of-concept using iframe + postMessage
2. **DISCOVER** exact protocol through hands-on testing
3. **DOCUMENT** findings as we build
4. **ITERATE** toward production-ready solution

**Bottom Line:** We know enough to begin implementation, but should expect to discover specific technical details through experimentation and source code review.

---

**Next Action:** Create a test environment to validate postMessage communication and document exact protocol behavior.

