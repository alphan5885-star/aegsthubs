import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders, X, Search, FolderOpen, FileCode } from "lucide-react";
import { ICON_MAP, type CategoryNode } from "@/lib/constants/market-categories";
import { useI18n } from "@/lib/i18n";

interface AdminCategoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  categoryTree: CategoryNode[];
  getCatLabel: (id: string, fallback: string) => string;
  onSaveNode: (id: string, label: string, iconName?: string) => void;
  onResetFactory: () => void;
}

export function AdminCategoryEditor({
  isOpen,
  onClose,
  categoryTree,
  getCatLabel,
  onSaveNode,
  onResetFactory,
}: AdminCategoryEditorProps) {
  const { t } = useI18n();
  const [selectedNodeToEdit, setSelectedNodeToEdit] = useState<{
    id: string;
    label: string;
    iconName?: string;
  } | null>(null);
  const [iconSearch, setIconSearch] = useState("");

  const handleSave = () => {
    if (selectedNodeToEdit) {
      onSaveNode(
        selectedNodeToEdit.id,
        selectedNodeToEdit.label,
        selectedNodeToEdit.iconName,
      );
      setSelectedNodeToEdit(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex justify-end select-none font-mono text-xs"
        >
          {/* Back close click */}
          <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

          {/* Main Panel Content */}
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-[500px] h-full bg-[#020202]/90 border-l border-white/[0.05] p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-between z-10 overflow-y-auto no-scrollbar"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                <div className="space-y-0.5">
                  <span className="text-[6px] text-primary font-black uppercase tracking-[0.3em]">
                    DEVELOPER_TOOLS
                  </span>
                  <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />{" "}
                    {t("market.dirEditor" as any)}.HUD
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 bg-white/[0.02] hover:bg-white/[0.08] border border-white/[0.05] rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-relaxed">
                {t("market.adminPanelDesc" as any)}
              </p>

              {/* Node Selection List */}
              <div className="space-y-3">
                <span className="text-[7px] text-zinc-600 font-black uppercase tracking-widest">
                  {t("market.editableDir" as any)}
                </span>
                <div className="space-y-2 border border-white/[0.03] p-3 rounded-2xl bg-black/40 max-h-[220px] overflow-y-auto no-scrollbar">
                  {categoryTree.map((rootNode) => (
                    <div key={rootNode.id} className="space-y-1.5">
                      {/* Root Edit */}
                      <button
                        onClick={() =>
                          setSelectedNodeToEdit({
                            id: rootNode.id,
                            label: rootNode.label,
                            iconName: rootNode.iconName,
                          })
                        }
                        className={`w-full text-left px-3 py-2 rounded-xl border flex items-center justify-between text-[8px] font-black uppercase transition-all ${
                          selectedNodeToEdit?.id === rootNode.id
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-transparent border-transparent text-zinc-300 hover:bg-white/[0.02]"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
                          {getCatLabel(rootNode.id, rootNode.label)}
                        </span>
                        <span className="text-[6px] text-zinc-600">
                          DÜZENLE
                        </span>
                      </button>

                      {/* Subs Edit */}
                      {(rootNode.items || []).map((subNode) => (
                        <div key={subNode.id} className="pl-4 space-y-1">
                          <button
                            onClick={() =>
                              setSelectedNodeToEdit({
                                id: subNode.id,
                                label: subNode.label,
                                iconName: subNode.iconName,
                              })
                            }
                            className={`w-full text-left px-3 py-1.5 rounded-lg border flex items-center justify-between text-[8px] font-bold uppercase transition-all ${
                              selectedNodeToEdit?.id === subNode.id
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-transparent border-transparent text-zinc-400 hover:bg-white/[0.02]"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <FileCode className="w-3.5 h-3.5 text-zinc-600" />
                              {getCatLabel(subNode.id, subNode.label)}
                            </span>
                            <span className="text-[6px] text-zinc-600">
                              {t("edit")}
                            </span>
                          </button>

                          {/* Sub-subs Edit */}
                          {(subNode.items || []).map((deepNode) => (
                            <button
                              key={deepNode.id}
                              onClick={() =>
                                setSelectedNodeToEdit({
                                  id: deepNode.id,
                                  label: deepNode.label,
                                  iconName: deepNode.iconName,
                                })
                              }
                              className={`w-full text-left px-3 py-1 rounded-md border flex items-center justify-between text-[8px] font-medium uppercase transition-all pl-8 ${
                                selectedNodeToEdit?.id === deepNode.id
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "bg-transparent border-transparent text-zinc-500 hover:bg-white/[0.01]"
                              }`}
                            >
                              <span>
                                {getCatLabel(deepNode.id, deepNode.label)}
                              </span>
                              <span className="text-[6px] text-zinc-600">
                                {t("edit")}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Editor Panel */}
              {selectedNodeToEdit && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/60 border border-white/[0.04] p-4 rounded-2xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                    <span className="text-[8px] text-primary font-black uppercase tracking-widest">
                      {t("market.activeEditMode" as any)}
                    </span>
                    <button
                      onClick={() => setSelectedNodeToEdit(null)}
                      className="text-[8px] text-zinc-600 hover:text-white uppercase font-bold"
                    >
                      {t("close")}
                    </button>
                  </div>

                  {/* Text Rename Input */}
                  <div className="space-y-1.5">
                    <label className="text-[7px] text-zinc-600 font-bold uppercase">
                      {t("market.categoryLabel" as any)}
                    </label>
                    <input
                      value={selectedNodeToEdit.label}
                      onChange={(e) =>
                        setSelectedNodeToEdit((prev) =>
                          prev ? { ...prev, label: e.target.value } : null,
                        )
                      }
                      className="w-full bg-black border border-white/[0.05] rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-primary/50 font-bold uppercase tracking-wider"
                    />
                  </div>

                  {/* 100+ Siberian Icon Picker */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[7px] text-zinc-600 font-bold uppercase">
                        {t("market.iconName" as any)}
                      </label>
                      <span className="text-[7px] text-primary font-black uppercase">
                        {t("market.selected" as any)}:{" "}
                        {selectedNodeToEdit.iconName || "NONE"}
                      </span>
                    </div>

                    {/* Search bar inside picker */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                      <input
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        placeholder={t("market.iconSearch" as any)}
                        className="w-full bg-black/85 border border-white/[0.04] rounded-lg pl-8 pr-3 py-1.5 text-[8px] text-white focus:outline-none focus:border-primary/30 uppercase font-bold placeholder:text-zinc-700"
                      />
                    </div>

                    {/* Icons Grid container */}
                    <div className="grid grid-cols-8 gap-1.5 border border-white/[0.03] p-2 rounded-xl bg-black max-h-[140px] overflow-y-auto no-scrollbar">
                      {Object.keys(ICON_MAP)
                        .filter((key) =>
                          key.toLowerCase().includes(iconSearch.toLowerCase()),
                        )
                        .map((key) => {
                          const IconNode = ICON_MAP[key];
                          const isSelected =
                            selectedNodeToEdit.iconName === key;
                          return (
                            <button
                              key={key}
                              onClick={() =>
                                setSelectedNodeToEdit((prev) =>
                                  prev ? { ...prev, iconName: key } : null,
                                )
                              }
                              className={`p-2 rounded-lg border flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-primary/20 border-primary text-primary"
                                  : "bg-white/[0.01] border-white/[0.03] text-zinc-500 hover:text-white hover:bg-white/[0.05]"
                              }`}
                              title={key}
                            >
                              <IconNode className="w-3.5 h-3.5" />
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Save Node Action */}
                  <button
                    onClick={handleSave}
                    className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-2 rounded-xl uppercase text-[9px] tracking-widest transition-colors cursor-pointer"
                  >
                    {t("market.applyChanges" as any)}
                  </button>
                </motion.div>
              )}
            </div>

            {/* Reset system */}
            <div className="border-t border-white/[0.04] pt-4 mt-6 flex justify-between gap-4">
              <button
                onClick={onResetFactory}
                className="px-4 py-2 border border-red-500/20 hover:border-red-500/50 bg-red-500/[0.03] hover:bg-red-500/10 text-red-500 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                {t("market.resetFactory" as any)}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-xl text-[8px] font-bold text-zinc-400 hover:text-white uppercase transition-all cursor-pointer"
              >
                {t("close")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
