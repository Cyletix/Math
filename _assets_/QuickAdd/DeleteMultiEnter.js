/**
 * 通用文本处理框架
 * ✅ **删除多余空行**  
 * ✅ **不会误删表格 `|` 之前的空行**  
 * ✅ **确保在分页符 `---` 之前至少有一个空行**
 * ✅ 获取选区时先 focus()，替换后恢复选区
 */
async function processSelectedText(transformFunction) {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice("No file is currently open.");
        return;
    }
    
    // 允许的文件类型
    const validExtensions = ["md", "canvas"];
    if (!validExtensions.includes(activeFile.extension)) {
        new Notice("The active file is not a Markdown or Canvas file.");
        return;
    }
    
    // 获取当前活动的编辑器
    const editor = app.workspace.activeEditor?.editor;
    if (!editor) {
        new Notice("No active editor found.");
        return;
    }
    
    // Focus 编辑器并获取当前选区
    editor.focus();
    let selection = editor.getSelection();
    if (!selection || selection.trim() === "") {
        new Notice("No text is selected.");
        return;
    }
    
    // 记录原始选区起始位置
    const startPos = editor.getCursor("from");
    
    // 应用传入的文本转换逻辑
    const modifiedText = transformFunction(selection);
    
    // 替换选中的文本
    editor.replaceSelection(modifiedText);
    
    // 计算新选区: 以 startPos 为起点，根据替换后文本计算行和列
    const lines = modifiedText.split("\n");
    let newEndPos;
    if (lines.length === 1) {
        newEndPos = { line: startPos.line, ch: startPos.ch + lines[0].length };
    } else {
        newEndPos = { line: startPos.line + lines.length - 1, ch: lines[lines.length - 1].length };
    }
    
    // 恢复选区
    editor.setSelection(startPos, newEndPos);
}

/**
 * 示例转换函数 1: 删除多余空行，并确保分页符 `---` 之前有空行
 */
function cleanEmptyLines(selection) {
    return selection
        .replace(/\n+[\t ]*(\n)+(?!\n*(\||-{3,}))/g, '\n')
        .replace(/^[\t ]+\n/gm, '\n')
        .replace(/\n*(\n-{3,})/g, '\n$1');
}

/**
 * 示例转换函数 2: 处理 LaTeX 公式，确保 Unicode 文字不会重复包裹 \text{}
 */
function transformLatex(selection) {
    return selection.replace(/\$(.+?)\$/gs, (match, content) => {
        let placeholders = [];
        let tempContent = content.replace(/\\text\s*\{[^}]*\}/g, (m) => {
            placeholders.push(m);
            return `%%PLACEHOLDER${placeholders.length - 1}%%`;
        });
        tempContent = tempContent.replace(/([^\x00-\x7F]+)/g, (m) => `\\text{${m}}`);
        tempContent = tempContent.replace(/%%PLACEHOLDER(\d+)%%/g, (m, idx) => placeholders[Number(idx)]);
        return `$${tempContent}$`;
    });
}

// QuickAdd 入口：依次执行 cleanEmptyLines 与 transformLatex，并保持替换后的选区
module.exports = async (params) => {
    const app = params.app;
    const editor = app.workspace.activeEditor?.editor;
    
    // Focus 并检查初始选区
    editor.focus();
    let selection = editor.getSelection();
    if (!selection || selection.trim() === "") {
        new Notice("No text is selected.");
        return;
    }
    
    await processSelectedText((text) => {
        let result = text;
        result = cleanEmptyLines(result);
        result = transformLatex(result);
        return result;
    });
    
    new Notice("Text transformation completed.");
};
