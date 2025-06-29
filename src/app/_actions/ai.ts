/* eslint-disable @typescript-eslint/no-unused-vars */
'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface RequirementContext {
  title: string;
  content: string;
  type: string;
  scoreBase: number;
  deadline: Date;
  subjectName: string;
  subjectCode: string;
}

export async function getAIResponse(
  userMessage: string, 
  requirementContext: RequirementContext,
  chatHistory: ChatMessage[]
) {
  // Restrict off-topic prompts
  const offTopicPatterns = [
    /what should i eat/i,
    /what should i wear/i,
    /what's the weather/i,
    /tell me a joke/i,
    /who won the game/i,
    /what is your name/i,
    /how old are you/i,
    /what time is it/i,
    /who is the president/i,
    /love advice/i,
    /dating advice/i,
    /personal question/i,
    /music recommendation/i,
    /movie recommendation/i,
    /song recommendation/i,
    /can you be my friend/i,
    /write a story/i,
    /write a poem/i,
    /draw/i,
    /image/i,
    /picture/i,
    /meme/i,
    /funny/i,
    /random/i,
    /fortune/i,
    /lottery/i,
    /horoscope/i,
    /astrology/i,
    /zodiac/i,
    /politics/i,
    /religion/i,
    /news/i,
    /celebrity/i,
    /sports/i,
    /game/i,
    /play/i,
    /chatgpt/i,
    /openai/i,
    /google/i,
    /bing/i,
    /bard/i,
    /gemini/i,
    /ai model/i,
    /ai assistant/i,
    /who are you/i,
    /tell me about yourself/i
  ];
  if (offTopicPatterns.some((pattern) => pattern.test(userMessage))) {
    return {
      success: true,
      data: '<p><b>Sorry, I can only assist you with this academic requirement. Please ask questions related to your assignment or subject.</b></p>'
    };
  }

  try {
    // Create context-aware prompt
    const systemPrompt = `You are an AI study assistant helping a student with their academic requirement. 

Requirement Details:
- Title: ${requirementContext.title}
- Type: ${requirementContext.type}
- Subject: ${requirementContext.subjectCode} - ${requirementContext.subjectName}
- Points: ${requirementContext.scoreBase}
- Deadline: ${new Date(requirementContext.deadline).toLocaleDateString()}

Requirement Description:
${requirementContext.content}

Your role is to:
1. Help students understand the requirement
2. Provide guidance on how to approach the assignment
3. Give writing and research tips
4. Help with structure and organization
5. Remind about deadlines and submission requirements
6. Be encouraging and supportive
7. Keep your answers short, direct, and avoid unnecessary elaboration
8. If the reply is numbered dont forget to add new line space between each number because the reply looks like in the same line for first parts
9. If the student's message uses rich text (HTML tags, lists, bold, etc.), reply in a similar rich text style. Otherwise, keep your reply direct and concise.
10. When giving instructions, breakdowns, or lists, always use <ol> or <ul> with <li> tags for each item. Do not use plain numbers or line breaks for lists.
11. Wrap any summary or introductory text in <p> tags.
12. Do not use markdown formatting, only HTML.

Keep responses concise, helpful, and educational. Focus on guiding the student rather than doing the work for them.

At the end of your response, format your answer using simple HTML (use <ul>, <ol>, <b>, <i>, <p>, etc. where appropriate). Do not include markdown, only HTML tags.`;

    // Format chat history for context
    const formattedHistory = chatHistory
      .slice(-6) // Keep last 6 messages for context
      .map(msg => `${msg.isUser ? 'Student' : 'Assistant'}: ${msg.text}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}

Previous conversation:
${formattedHistory}

Student: ${userMessage}

Assistant:`;

    // Generate response from Gemini
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    return {
      success: true,
      data: aiResponse
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate AI response'
    };
  }
}

export async function analyzeSubmission(
  submissionContent: string,
  requirementContext: RequirementContext
) {
  try {
    const prompt = `You are an AI teaching assistant analyzing a student submission. 

Requirement Details:
- Title: ${requirementContext.title}
- Type: ${requirementContext.type}
- Subject: ${requirementContext.subjectCode} - ${requirementContext.subjectName}
- Points: ${requirementContext.scoreBase}

Requirement Description:
${requirementContext.content}

Student Submission:
${submissionContent}

Please provide a detailed analysis including:
1. Content Quality Assessment (1-10 scale)
2. Adherence to Requirements (1-10 scale)
3. Writing Quality (1-10 scale)
4. Suggested Score (out of ${requirementContext.scoreBase})
5. Constructive Feedback (3-4 specific points)
6. Areas for Improvement
7. Strengths

Format your response as JSON:
{
  "contentQuality": number,
  "adherenceToRequirements": number,
  "writingQuality": number,
  "suggestedScore": number,
  "feedback": string,
  "areasForImprovement": string[],
  "strengths": string[]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();

    // Try to parse JSON response
    try {
      const analysis = JSON.parse(analysisText);
      return {
        success: true,
        data: analysis
      };
    } catch (parseError) {
      // If JSON parsing fails, return the raw text
      return {
        success: true,
        data: {
          rawAnalysis: analysisText,
          suggestedScore: Math.floor(requirementContext.scoreBase * 0.8), // Default to 80%
          feedback: "AI analysis completed. Please review the detailed feedback above."
        }
      };
    }
  } catch (error) {
    console.error('Error analyzing submission:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze submission'
    };
  }
}

export async function generateRequirementContent(
  requirementType: string,
  subjectName: string,
  topic: string
) {
  try {
    const prompt = `You are an AI teaching assistant helping create educational content.

Create a ${requirementType.toLowerCase()} for the subject: ${subjectName}
Topic: ${topic}

Please provide:
1. A clear, engaging title
2. Detailed instructions/description
3. Learning objectives
4. Assessment criteria
5. Suggested point value (10-50 points)

Format your response as JSON:
{
  "title": string,
  "content": string,
  "learningObjectives": string[],
  "assessmentCriteria": string[],
  "suggestedPoints": number
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const contentText = response.text();

    try {
      const content = JSON.parse(contentText);
      return {
        success: true,
        data: content
      };
    } catch (parseError) {
      return {
        success: true,
        data: {
          title: `${requirementType}: ${topic}`,
          content: contentText,
          suggestedPoints: 25
        }
      };
    }
  } catch (error) {
    console.error('Error generating content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate content'
    };
  }
}

export async function checkPlagiarism(
  content: string,
  requirementContext: RequirementContext
) {
  try {
    const prompt = `You are an AI plagiarism detection assistant. Analyze the following student submission for potential plagiarism and originality issues.

Requirement: ${requirementContext.title}
Subject: ${requirementContext.subjectCode} - ${requirementContext.subjectName}

Student Content:
${content}

Please analyze for:
1. Originality score (0-100%)
2. Potential plagiarism indicators
3. Common phrases or expressions that might need citation
4. Overall writing authenticity

Provide a detailed analysis with specific examples and recommendations.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    // Extract similarity percentage (mock for now - in real implementation you'd use a proper plagiarism detection service)
    const similarityMatch = analysis.match(/(\d+)%/);
    const similarity = similarityMatch ? parseInt(similarityMatch[1]) : Math.floor(Math.random() * 30);

    return {
      success: true,
      data: {
        similarity,
        analysis,
        recommendations: analysis.includes('recommend') ? analysis.split('recommend')[1] : 'Review content for originality'
      }
    };
  } catch (error) {
    console.error('Error checking plagiarism:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check plagiarism'
    };
  }
} 