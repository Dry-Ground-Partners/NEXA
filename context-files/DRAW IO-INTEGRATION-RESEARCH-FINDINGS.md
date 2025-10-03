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


==========// MORE INFO BELOW //==========

RESPONSE FROM CHATGPT:
```
Yes — I dug into the docs, blog posts, and integration code, and here’s what I found: you can convert XML → PNG (or other formats) programmatically via the embed protocol, with some constraints and details to be aware of. Below is a refined “fill-in” of your gaps, plus caveats. Use this to update your assessment. ✅ Protocol & Embed Mode Details (Filling the Gaps) Embed Mode & URL Parameters The embed=1 parameter activates embed mode. In that mode, the editor sends an { event: "init" } message once ready. draw.io +1 The proto=json URL parameter enables JSON-structured postMessage communication. draw.io +2 jgraph.github.io +2 Additional known URL parameters: spin=1 → show loading spinner while waiting for diagram data. draw.io modified, keepmodified → control “modified state” behavior. draw.io libraries=1 → enable shape libraries in embed mode. draw.io noSaveBtn=1, saveAndExit=1, noExitBtn=1 → control which buttons (Save, Exit) appear. draw.io configure=1 → triggers a { event: 'configure' } message to let the host supply configuration before full initialization. draw.io returnbounds=1 → returns JSON with diagram bounds after loading. draw.io Note: URL parameters have precedence over flags in the load message. draw.io postMessage Protocol (Actions / Events) The official drawio-integration repo (and its documentation pages) describe a fairly well-defined JSON messaging protocol. jgraph.github.io +2 GitHub +2 Here’s a refined summary: 
| Direction         | Message Type / Key  | Fields / Payload                                                                                            | Purpose / Notes                                                                                               |          |          |                                           |                                                                                                                      | | ----------------- | ------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------- | -------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | | **Editor → Host** | `event: 'init'`     | `{ event: 'init' }`                                                                                         | Signals that the editor is ready to receive load data. ([draw.io][1])                                         |          |          |                                           |                                                                                                                      | | **Host → Editor** | `action: 'load'`    | `{ action: 'load', xml: <XML string>, autosave?: 1, saveAndExit?: 0/1, title?: string, modified?: string }` | Loads XML into the editor. `autosave` flag enables autosave. ([draw.io][1])                                   |          |          |                                           |                                                                                                                      | | **Editor → Host** | `event: 'autosave'` | `{ event: 'autosave', xml: <XML string> }`                                                                  | Sent periodically when editor content changes (if autosave is enabled). ([draw.io][1])                        |          |          |                                           |                                                                                                                      | | **Editor → Host** | `event: 'save'`     | `{ event: 'save', xml: <XML string> }`                                                                      | Sent when user triggers a save. ([jgraph.github.io][2])                                                       |          |          |                                           |                                                                                                                      | | **Host → Editor** | `action: 'export'`  | `{ action: 'export', format: <"png"                                                                         | "svg"                                                                                                         | "xmlpng" | "xmlsvg" | "pdf">, xml?: <XML> , spinKey?: string }` | Requests export of diagram in given format. `xml` may optionally be provided (but not always needed) ([DeepWiki][3]) | | **Editor → Host** | `event: 'export'`   | `{ event: 'export', data: <Base64 string or data URI>, xml?: <XML> }`                                       | Response containing the exported image or format data plus possibly embedded XML. ([DeepWiki][3])             |          |          |                                           |                                                                                                                      | | **Editor → Host** | `event: 'exit'`     | `{ event: 'exit', xml: <XML> }`                                                                             | Signifies that the editor either closed or user left. Optionally includes latest XML. ([jgraph.github.io][2]) |          |          |                                           |                                                                                                                      | [1]: https://www.drawio.com/doc/faq/embed-mode?utm_source=chatgpt.com "Embed mode - draw.io" [2]: https://jgraph.github.io/drawio-integration/?utm_source=chatgpt.com "diagrams.net Integration | drawio-integration" [3]: https://deepwiki.com/jgraph/drawio-integration/2.2-integration-protocol?utm_source=chatgpt.com "Integration Protocol | jgraph/drawio-integration | DeepWiki"
 Other message types (e.g. configure) exist when using configure=1 param. draw.io +2 DeepWiki +2 Important behavioral notes: You must wait for event: 'init' before sending the action: 'load' message. If you send too early, messages may get ignored. jgraph.github.io +2 draw.io +2 The host may include autosave: 1 in the load message to enable autosave mode. draw.io +1 If autosave is on, the editor will emit event: 'autosave' messages with the current XML. draw.io +2 GitHub +2 The host can request an export (e.g. PNG) at any time by sending action: 'export'. jgraph.github.io +1 The format xmlpng is supported, which means a PNG image with embedded XML (so re-editable later) draw.io +3 jgraph.github.io +3 draw.io +3 Thus, it is factual: the protocol supports a programmatic export, including PNG, and it delivers the result via postMessage. Export / Embedded XML in PNG draw.io supports embedding the diagram XML inside PNG files (via metadata) in the zTxt section. draw.io +2 draw.io +2 When exporting as PNG via the UI or via export action, you should enable “Include a copy of my diagram / diagram data” so that the resulting PNG is re-editable. draw.io +3 draw.io +3 draw.io +3 The blog “Embedded XML in PNG image files” describes exactly this: the PNG format supports metadata embedding, and draw.io uses that to store the XML inside the image so that reloading is possible. draw.io One caveat: some image-hosting services or processing pipelines may strip metadata from PNGs (which would remove the embedded XML). draw.io +1 Therefore, when you use format: "xmlpng" in export, you should get back a PNG (data URI) that also contains the diagram XML inside it (so the file is both a viewable image and editable later). ⚠️ Caveats, Observations & Implementation Warnings Timing matters: if you send messages too early (before init) they may be discarded. Very large diagrams may cause heavy memory or payload sizes (big Base64 strings). Origin checking is crucial: validate event.origin and event.source before accepting messages. If exporting images with embedded XML, but then passing through an image pipeline that strips metadata, you may lose the embedded XML. Some forum issues show that debugging cross-window postMessage can be tricky: breakpoints may interfere with postMessage during debugging. Stack Overflow There is limited control over export parameters (e.g., DPI, scaling) in the standard protocol (not many documented knobs). Some actions (like pushing external file formats into the editor via postMessage) may be unsupported in certain versions. For instance, in an old GitHub issue, someone asked about “importing” a file format via JSON protocol and was told it was not supported in that version. GitHub ✅ Conclusion: Your Hypothesis Is Valid (with nuance) Yes — you can programmatically convert the XML to a PNG (or other formats) via the embed protocol (action: "export", format: "png" / "xmlpng") without user intervention. The editor will reply with a Base64-encoded PNG (or data URI), potentially with the XML embedded. That enables you to convert to a Blob or send to your backend. Thus your assumption is correct; it’s not just theoretical — it's supported by the official integration protocol. But implementation has details you must respect (timing, message structure, origin, size) to make it robust.
```

RESEARCH FROM CHATGPT:
```
# 🔬 DRAW.IO INTEGRATION RESEARCH - FOLLOW-UP REPORT

**Research Date:** October 1, 2025  
**Purpose:** Fill knowledge gaps on draw.io integration for NEXA `/visuals` page  
**Status:** ✅ SUBSTANTIALLY COMPLETE - Key protocol details confirmed, a few advanced options still unclear

---

## 📊 EXECUTIVE SUMMARY

### ✅ Newly Confirmed
1. **postMessage Protocol** is officially documented and supported: actions like `load`, `export`, `merge`; events like `init`, `autosave`, `save`, `exit`, `configure`.  
2. **Embed URL Parameters** include: `embed=1`, `proto=json`, `spin=1`, `libraries=1`, `ui=`, `offline=1`, `saveAndExit=1`, `noSaveBtn=1`, `noExitBtn=1`, `configure=1`, `returnbounds=1`.  
3. **Export Mechanism**: sending `{ action: "export", format: "png" }` returns `{ event: "export", data: <Base64 PNG> }`. Other formats include `svg`, `pdf`, `xmlpng`, `xmlsvg`.  
4. **XML Initialization**: a blank diagram uses the minimal `mxGraphModel` with `<root><mxCell id="0"/><mxCell id="1" parent="0"/></root>`.  
5. **Autosave** is enabled by passing `autosave: 1` in the `load` action. Editor then emits `event: "autosave"` with current XML.  
6. **Timing**: must wait for `event: "init"` before sending `load`. If sent too early, messages are ignored.  

### ⚠️ Remaining Gaps
1. **Export Quality Controls**: No documented way to set DPI, scaling, or resolution. Only base64 output confirmed.  
2. **Autosave Frequency**: Trigger timing is internal to draw.io, not configurable from host.  
3. **Error Events**: No published list of error messages (e.g. failed export, invalid XML). Must be observed in testing.  
4. **Compression/Encoding**: XML is typically plain text. No formal confirmation of compressed variants beyond embedded XML in PNG/SVG.  

---

## 🔌 PART 1: POSTMESSAGE PROTOCOL

### Actions (Host → Editor)
- `load`: `{ action: "load", xml: "<mxGraphModel>...</mxGraphModel>", autosave: 1, saveAndExit: 0 }`  
- `export`: `{ action: "export", format: "png"|"svg"|"pdf"|"xmlpng"|"xmlsvg" }`  
- `merge`: merges XML into an existing diagram  

### Events (Editor → Host)
- `init`: editor ready to receive load  
- `autosave`: `{ event: "autosave", xml: "<...>" }`  
- `save`: `{ event: "save", xml: "<...>" }`  
- `export`: `{ event: "export", data: "<Base64...>", xml?: "<...>" }`  
- `exit`: `{ event: "exit", xml?: "<...>" }`  
- `configure`: triggered if `configure=1` param is set, lets host send configuration  

---

## 🌐 PART 2: EMBED URL PARAMETERS (CONFIRMED)

- `embed=1` → embed mode  
- `proto=json` → JSON postMessage protocol  
- `spin=1` → show loading spinner  
- `libraries=1` → show shape libraries  
- `ui=atlas|minimal|kennedy...` → UI theme  
- `offline=1` → offline/standalone mode  
- `saveAndExit=1` → enables Save & Exit button  
- `noSaveBtn=1` / `noExitBtn=1` → hide buttons  
- `configure=1` → trigger configuration event  
- `returnbounds=1` → return bounds JSON after load  

---

## 📦 PART 3: XML STRUCTURE

**Blank XML template (minimal valid diagram):**

    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
      </root>
    </mxGraphModel>

- User elements get added as `<mxCell vertex="1"...>` or `<mxCell edge="1"...>`  
- `style` attribute encodes visual styling.  
- No compression by default; XML is plain text.  

---

## 🖼️ PART 4: EXPORT FUNCTIONALITY

**Confirmed usage:**

    // Request
    iframe.contentWindow.postMessage({
      action: "export",
      format: "png"
    }, "*");

    // Response
    window.addEventListener("message", (event) => {
      const msg = event.data;
      if (msg.event === "export") {
        const base64 = msg.data; // "iVBORw0..." base64 string
      }
    });

**Formats Supported:**
- `png` → plain image  
- `xmlpng` → PNG with embedded XML  
- `svg` → vector  
- `xmlsvg` → SVG with embedded XML  
- `pdf` → document  

**Gaps:** No documented way to configure DPI, scaling, or resolution in embed API.  

---

## 🔄 PART 5: TIMING & AUTOSAVE

- Must wait for `event: "init"` before sending `load`.  
- `autosave: 1` in load action enables autosave messages.  
- Autosave frequency not configurable. Triggered internally by editor changes.  

---

## 🚨 PART 6: SECURITY

- Validate `event.origin` before processing messages.  
- Use `sandbox="allow-scripts allow-same-origin"` for iframe if possible.  
- Add CSP:  

    Content-Security-Policy: frame-src 'self' https://drawio.yourdomain.com

- Monitor Base64 payload sizes, as PNG data URIs can be large.  

---

## 📋 PART 7: STATUS OF GAPS

### ❌ Closed
- Protocol actions/events  
- Embed URL parameters  
- PNG export implementation  
- Blank XML structure  
- Event handling basics  

### ⚠️ Still Open
- Export resolution/DPI controls  
- Autosave frequency config  
- Error event list  

---

## 🎬 CONCLUSION

**Status: ~85% Complete**  

- ✅ Protocol and flows are clear enough to prototype.  
- ✅ Export to PNG/XMLPNG/SVG/PDF is confirmed.  
- ✅ Blank XML structure identified.  

Still missing are advanced options (quality controls, error events). These require either source code review or hands-on testing.  

**Bottom Line:** You can build a working iframe + postMessage integration today. Remaining unknowns are optimizations, not blockers.  

```