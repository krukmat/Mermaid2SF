# 🚀 Quick Start Guide

> **From zero to working Flow in 2 minutes**

---

## ⚡ Option 1: Interactive Mode (Easiest)

**No CLI knowledge needed!**

```bash
npm install
npm run build
npm run cli -- interactive
```

**What happens:**
```
Select mode: Create new flow (wizard)
Flow API name: My_First_Flow
Flow label: My First Flow
Process type: Screen
Include Screen? y
Include Assignment? y
Include Decision? y
Save to: ./output/My_First_Flow.mmd

✓ Saved Mermaid diagram
✓ Validation passed
✓ All outputs generated!
```

**You get:**
- `My_First_Flow.mmd` - The diagram
- `My_First_Flow.flow-meta.xml` - Deploy to Salesforce
- `My_First_Flow.flow.json` - Version control this
- `My_First_Flow.md` - Auto documentation

---

## 📋 Option 2: Command Line

**Compile an example:**

```bash
npm run cli -- compile \
  --input examples/v1/complete-flow.mmd \
  --out-flow ./output/flows \
  --out-json ./output/dsl \
  --out-docs ./output/docs
```

**Output:**
```
✓ Compilation successful
  Flow XML: ./output/flows/complete-flow.flow-meta.xml
  DSL JSON: ./output/dsl/complete-flow.flow.json
  Docs: ./output/docs/complete-flow.md
```

---

## 🔍 Useful Commands

### Validate flows:
```bash
npm run cli -- lint --input examples/v1/
```

### Analyze complexity:
```bash
npm run cli -- explain --input my-flow.mmd
```

### Watch mode (live reload):
```bash
npm run cli -- compile --input my-flow.mmd --watch
```

### Debug mode (with timings):
```bash
npm run cli -- compile --input my-flow.mmd --debug
```

---

## 📊 Real Output Examples

### Explain Command:
```
Flow: Customer_Onboarding
Elements: 7 (Screens 1, Decisions 1, Assignments 1, RC 1)
Complexity: 2 (LOW)
Validation: ✓ 0 errors, 0 warnings
```

### Lint Summary:
```
Files checked: 5
Total errors: 0
✓ All files passed linting
```

### Debug Timings:
```
Stage timings (ms):
  read: 2
  parse: 5
  validate: 3
  outputs: 12
Total: 22ms
```

---

## 🎯 Next Steps

1. **Try interactive mode** - Easiest way to start
2. **Check examples/** - See real Mermaid flows
3. **Read CLAUDE.md** - Development guidelines
4. **Read architecture doc** - System design

---

## 💡 Pro Tips

- Use `--watch` for live development
- Use `--debug` to see performance
- Use `--strict` in CI/CD pipelines
- Use interactive mode for learning
- Version control the `.flow.json` files

---

**That's it! Start with interactive mode and explore from there.**
