import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../ui/Button";
import {
  clearSelectedModel,
  fetchModelCatalog,
  getSelectedModelSync,
  initSelectedModel,
  setSelectedModel,
  type ModelCatalog,
} from "../../services/models";

/**
 * LLM model picker. The catalog is fetched from the backend proxy (key stays
 * server-side); the selection is persisted locally and sent via X-LLM-Model.
 */
export function ModelPicker() {
  const theme = useTheme();
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    void initSelectedModel().then((value) => setSelected(value));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchModelCatalog();
      setCatalog(result);
      if (!selected) setSelected(result.defaultModel || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "拉取失败");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  const choose = useCallback(async (id: string) => {
    await setSelectedModel(id);
    setSelected(id);
  }, []);

  const useDefault = useCallback(async () => {
    await clearSelectedModel();
    setSelected(null);
  }, []);

  const activeId = selected ?? getSelectedModelSync();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Button
          title={catalog ? "重新拉取模型列表" : "一键拉取可用模型"}
          variant="secondary"
          onPress={() => void load()}
          loading={loading}
        />
        <Pressable accessibilityRole="button" onPress={() => void useDefault()}>
          <Text style={[theme.font("sm"), { color: theme.c.primary }]}>恢复服务器默认</Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={[theme.font("xs"), { color: theme.c.danger }]}>{error}</Text>
      ) : null}

      {catalog ? (
        <>
          <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>
            供应商：{catalog.profileId} · {catalog.baseUrl} · 共 {catalog.models.length} 个模型 · 默认 {catalog.defaultModel}
          </Text>
          <ScrollView style={styles.list} contentContainerStyle={{ gap: 4 }}>
            {catalog.models.map((model) => {
              const isActive = model.id === activeId;
              return (
                <Pressable
                  key={model.id}
                  accessibilityRole="button"
                  onPress={() => void choose(model.id)}
                  style={[
                    styles.item,
                    {
                      backgroundColor: isActive ? theme.c.primarySoft : theme.c.surfaceAlt,
                      borderColor: isActive ? theme.c.primary : theme.c.border,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[theme.font("sm"), { color: isActive ? theme.c.primaryStrong : theme.c.textPrimary, flex: 1 }]}
                  >
                    {model.id}
                  </Text>
                  {model.owned_by ? (
                    <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]} numberOfLines={1}>
                      {model.owned_by}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>
          点击「一键拉取可用模型」，从后端获取可切换的模型列表（密钥不经过客户端）。
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" },
  list: { maxHeight: 280, borderRadius: 12 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
