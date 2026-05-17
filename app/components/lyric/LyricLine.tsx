import React, { useMemo } from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';

import type { ILyricText, IWordData } from '../../types';
import { getWordProgress } from '../../utils/lyricParser';

interface LyricLineProps {
  data: ILyricText;
  isActive: boolean;
  currentTimeMs: number;
  fontSize: number;
  showTranslation: boolean;
  onPress?: (startTime: number) => void;
}

function WordByWordText({
  words,
  currentTimeMs,
  isActive,
  fontSize,
}: {
  words: IWordData[];
  currentTimeMs: number;
  isActive: boolean;
  fontSize: number;
}) {
  const { wordIndex: activeWordIndex, progress: activeWordProgress } = useMemo(
    () => getWordProgress(words, currentTimeMs),
    [words, currentTimeMs]
  );

  return (
    <Text style={[styles.wordContainer, { fontSize }]}>
      {words.map((word, idx) => {
        const isCurrentWord = isActive && idx === activeWordIndex;
        const isPastWord = isActive && idx < activeWordIndex;

        if (isCurrentWord) {
          return (
            <React.Fragment key={idx}>
              <Text style={[styles.wordBase, { fontSize, color: 'rgba(255,255,255,0.3)' }]}>
                {word.text}
              </Text>
              <Text
                style={[
                  styles.wordHighlight,
                  { fontSize, width: `${activeWordProgress * 100}%` },
                ]}
                numberOfLines={1}
              >
                {word.text}
              </Text>
            </React.Fragment>
          );
        }

        return (
          <Text
            key={idx}
            style={[
              styles.wordBase,
              { fontSize },
              isPastWord ? styles.wordActive : styles.wordInactive,
            ]}
          >
            {word.text}
          </Text>
        );
      })}
    </Text>
  );
}

export default function LyricLine({
  data,
  isActive,
  currentTimeMs,
  fontSize,
  showTranslation,
  onPress,
}: LyricLineProps) {
  const handlePress = () => {
    if (onPress && data.startTime !== undefined) {
      onPress(data.startTime);
    }
  };

  const textContent = useMemo(() => {
    if (data.hasWordByWord && data.words && data.words.length > 0) {
      return (
        <WordByWordText
          words={data.words}
          currentTimeMs={currentTimeMs}
          isActive={isActive}
          fontSize={fontSize}
        />
      );
    }

    return (
      <Text
        style={[
          styles.lineText,
          { fontSize },
          isActive ? styles.lineActive : styles.lineInactive,
        ]}
        numberOfLines={2}
      >
        {data.text}
      </Text>
    );
  }, [data, isActive, currentTimeMs, fontSize]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={!onPress}
    >
      <View style={styles.container}>
        {textContent}
        {showTranslation && data.trText ? (
          <Text
            style={[
              styles.translationText,
              { fontSize: fontSize - 2 },
              isActive ? styles.translationActive : styles.translationInactive,
            ]}
            numberOfLines={2}
          >
            {data.trText}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    alignItems: 'center',
  },
  lineText: {
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 28,
  },
  lineActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  lineInactive: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  translationText: {
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 20,
  },
  translationActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  translationInactive: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  wordContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  wordBase: {
    fontWeight: '700',
    lineHeight: 28,
  },
  wordActive: {
    color: '#ffffff',
  },
  wordInactive: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  wordHighlight: {
    position: 'absolute',
    left: 0,
    top: 0,
    color: '#ffffff',
    fontWeight: '700',
    overflow: 'hidden',
    lineHeight: 28,
  },
});
