# 🎬 VidWeaver - AI Video Producer

## 1. Overview

This document specifies the requirements for **VidWeaver**, an application designed to transform a collection of documents into a fully produced, engaging YouTube video. The application will guide users through a seamless, three-step process: uploading content, generating and refining an AI-written script, and finally, generating a video complete with AI-selected visuals and other relevant assets. The target UI is a minimal, focused, dark-themed interface designed for clarity and ease of use.

---

## 2. Core Features & Requirements

### 2.1. User Flow & Staged Interface
The application must be structured around a clear, linear, three-stage process. The user should navigate between these stages using a primary navigation component.
- **Stage 1: Upload:** The user provides a project name and uploads source documents.
- **Stage 2: Script:** The user reviews and edits the AI-generated script.
- **Stage 3: Generate:** The user previews the final video and its assets.

### 2.2. Intelligent Document Processing
- **File Ingestion:** The system must accept multiple file uploads, including `.pdf`, `.docx`, `.txt`, `.png`, and `.jpg` formats.
- **Content Analysis:** The AI will process the content of all uploaded files.
- **Content-Type Detection:** The AI must analyze the provided documents and determine the most appropriate video format from a predefined list (e.g., `Tutorial`, `Storytelling`, `Product Review`).
- **Summarization:** The AI must generate a concise, one-sentence summary for each uploaded document.

### 2.3. AI-Powered Script Generation
- **Contextual Scriptwriting:** Using the summaries and the detected content type, the AI will generate a complete video script.
- **Structured Output:** The script must be structured into standard YouTube video segments: a catchy `intro`, the `mainContent`, a brief `summary`, and a compelling `cta` (call-to-action).
- **User Editable:** The generated script must be presented in a text area where the user can make manual edits and refinements.
- **Regeneration:** The user must have the option to regenerate the entire script with a single click if they are not satisfied with the initial result.

### 2.4. AI Video Generation
The core of the video generation will be powered by a **Temporal Chain of Thought** methodology (detailed in Section 4).
- **Automated Visual Selection:** For each segment of the script, the AI will generate a relevant, high-quality visual.
- **Dynamic Slideshow Preview:** The final output will be presented as a dynamic slideshow where each scene displays its corresponding visual with the script text overlaid as a subtitle. The slideshow should auto-play with subtle animations (e.g., Ken Burns effect) to create a sense of motion.
- **Scene Breakdown:** The user must be able to view a detailed breakdown of each scene, including the visual, the script chunk, and the AI's justification for its visual choice.
- **Asset Generation:** The AI will also generate a high-impact `thumbnail` for the video and a list of relevant YouTube `tags`.

---

## 3. System Architecture

The application will be a client-side web application built with React and Vite. All AI logic will be handled directly on the client by communicating with the Google Gemini API.

### Architecture Diagram

```mermaid
graph TD
    subgraph "User's Browser"
        A[User] --> B{React UI (Vite)}
        
        subgraph "Client-Side Application"
            B --> C[UI Components: Upload, Script, Video];
            C -- Triggers --> D[aiService.ts Logic];
        end
    end

    subgraph "Google Cloud"
        E[Google Gemini API]
        F[Text Model: gemini-2.5-flash-preview-04-17]
        G[Image Model: imagen-3.0-generate-002]
    end
    
    D -- API Call --> E;
    E --> F;
    E --> G;

    style A fill:#fff,stroke:#333,stroke-width:2px
    style E fill:#fbbc05,stroke:#333,stroke-width:2px
```

---

## 4. Video Generation Methodology: Temporal Chain of Thought

To ensure a cohesive and contextually relevant video, the system will employ a **Temporal Chain of Thought** process for generating visuals. This method breaks down the creative process into a logical sequence, mimicking how a human director would approach the task.

### Step 1: Scene Segmentation
The final, user-approved script is automatically segmented into smaller, logical chunks. Each chunk represents a single "scene" in the video. This ensures that each generated visual corresponds to a specific, manageable idea rather than a long, complex paragraph.

### Step 2: Visual Prompt Generation (The "Art Director" Step)
For each scene chunk, the system makes a call to the text model (`gemini-2.5-flash-preview-04-17`) with a specific persona-driven prompt.
- **Persona:** The AI is instructed to act as an "AI Art Director."
- **Task:** Its task is to read the script chunk and generate two key pieces of information:
    1.  `imagePrompt`: A concise, cinematic, and visually descriptive prompt suitable for an AI image generator. This prompt is the art director's "shot instruction."
    2.  `justification`: A brief explanation of *why* this visual was chosen and how it connects to the script content. This provides transparency to the user.
- **Output:** The model must return this information in a structured JSON format.

### Step 3: Image Generation
The `imagePrompt` generated by the "Art Director" AI is then passed to the image generation model (`imagen-3.0-generate-002`).
- **Enrichment:** The prompt is enriched with additional context, such as the video's `contentType` and general keywords like "cinematic lighting" and "high detail," to ensure high-quality, stylistically consistent output.
- **Execution:** The image model generates the visual for the scene.

### Step 4: Asset Aggregation
This process (Steps 2 and 3) is repeated for every scene in the script. All generated images, along with their justifications and script chunks, are compiled into the final `Video` data structure. Finally, a separate AI call is made to generate the video's thumbnail and YouTube tags based on the script's summary.
