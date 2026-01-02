export class ConnectorGenerator {
  generateConnectorLines(
    targetReference: string | undefined,
    indentLevel = 8,
    tagName = 'connector',
  ): string[] {
    if (!targetReference) {
      return [];
    }

    const indent = ' '.repeat(indentLevel);
    const targetIndent = ' '.repeat(indentLevel + 4);

    return [
      `${indent}<${tagName}>`,
      `${targetIndent}<targetReference>${targetReference}</targetReference>`,
      `${indent}</${tagName}>`,
    ];
  }
}
