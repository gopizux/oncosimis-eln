import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'

export const exportToWord = async (data, type) => {
  try {
    let doc

    if (type === 'experiment') {
      doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: data.title,
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Experiment ID: ${data.experiment_id}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Status: ${data.status}`,
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'Objective',
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: data.objective || 'No objective specified',
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Project: ',
                  bold: true,
                }),
                new TextRun({
                  text: data.projects?.title || 'N/A',
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Protocol: ',
                  bold: true,
                }),
                new TextRun({
                  text: data.protocols?.title || 'N/A',
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Start Date: ',
                  bold: true,
                }),
                new TextRun({
                  text: data.start_date ? new Date(data.start_date).toLocaleDateString() : 'N/A',
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'End Date: ',
                  bold: true,
                }),
                new TextRun({
                  text: data.end_date ? new Date(data.end_date).toLocaleDateString() : 'N/A',
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Created by: ',
                  bold: true,
                }),
                new TextRun({
                  text: data.created_by_profile?.full_name || 'Unknown',
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Created on: ',
                  bold: true,
                }),
                new TextRun({
                  text: new Date(data.created_at).toLocaleString(),
                }),
              ],
            }),
          ],
        }],
      })
    } else if (type === 'protocol') {
      const stepsChildren = []
      if (data.steps && Array.isArray(data.steps)) {
        data.steps.forEach((step, index) => {
          stepsChildren.push(
            new Paragraph({
              text: `${index + 1}. ${step}`,
            })
          )
        })
      }

      const materialsChildren = []
      if (data.required_materials && Array.isArray(data.required_materials)) {
        data.required_materials.forEach((material) => {
          materialsChildren.push(
            new Paragraph({
              text: `• ${material}`,
            })
          )
        })
      }

      doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: data.title,
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Protocol ID: ${data.protocol_id} | Version: ${data.version}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Status: ${data.status}`,
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'Description',
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: data.description || 'No description provided',
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'Procedure Steps',
              heading: HeadingLevel.HEADING_2,
            }),
            ...stepsChildren,
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'Required Materials',
              heading: HeadingLevel.HEADING_2,
            }),
            ...materialsChildren,
            new Paragraph({ text: '' }),
            ...(data.safety_notes ? [
              new Paragraph({
                text: 'Safety Notes',
                heading: HeadingLevel.HEADING_2,
              }),
              new Paragraph({
                text: data.safety_notes,
              }),
            ] : []),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Created by: ',
                  bold: true,
                }),
                new TextRun({
                  text: data.created_by_profile?.full_name || 'Unknown',
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Created on: ',
                  bold: true,
                }),
                new TextRun({
                  text: new Date(data.created_at).toLocaleString(),
                }),
              ],
            }),
          ],
        }],
      })
    }

    const blob = await Packer.toBlob(doc)
    const fileName = `${data.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.docx`
    saveAs(blob, fileName)
    
    return true
  } catch (error) {
    console.error('Error exporting to Word:', error)
    throw error
  }
}

