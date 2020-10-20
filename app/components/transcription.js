import React, { useState, useEffect, useMemo } from 'react'
import cx from 'classnames'
import { createUseStyles } from 'react-jss'
import FitFontToBottom from './lib/fit-font-to-bottom'

function getSeconds(wordTimeObj) {
  return parseFloat(wordTimeObj.seconds + '.' + wordTimeObj.nanos)
}

const windowSeconds = 0
const defaultFontSize = 2.0

function withinTime(wordObj, currentTime) {
  let startTime = getSeconds(wordObj.startTime)
  let endTime = getSeconds(wordObj.endTime)
  return currentTime >= startTime - windowSeconds && currentTime <= endTime + windowSeconds
}

function withinSentence(sentence, currentTime) {
  return currentTime >= sentence.startTime && currentTime <= sentence.endTime
}

function emptySentence() {
  return { startTime: 0, endTime: 0, words: [] }
}

const endPunctuation = ['.', '?', '!']

function timedStringsToSentences(timedStrings) {
  if (!timedStrings || !timedStrings.length) return [emptySentence()]
  return timedStrings.map(timedString => ({
    startTime: timedString.startTime,
    endTime: timedString.endTime,
    words: timedString.string.split(' ').map(w => ({
      word: w,
      startTime: timedString.startTime,
      endTime: timedString.endTime,
    })),
  }))
}

function getSentences(transcript, language) {
  if (!transcript) return [emptySentence()]
  if (transcript.languages && language && transcript.languages[language]) {
    return timedStringsToSentences(transcript.languages[language].timedStrings)
  } else if (transcript.words) {
    return transcript.words.reduce(
      (sentences, wordObj, idx, src) => {
        const lastSentence = sentences[sentences.length - 1]
        const endTime = getSeconds(wordObj.endTime)
        if (!lastSentence.startTime) lastSentence.startTime = getSeconds(wordObj.startTime)
        if (lastSentence.endTime < endTime) lastSentence.endTime = endTime
        lastSentence.words.push(wordObj)
        if (endPunctuation.includes(wordObj.word.slice(-1)) && idx < src.length - 1)
          // don't start a new sentence if this is the last word
          sentences.push(emptySentence())
        return sentences
      },
      [emptySentence()]
    )
  } else return [emptySentence()]
}

const Transcription = ({ transcript, element, language }) => {
  const classes = useStyles()
  const { transcription } = classes
  const [currentTime, setCurrentTime] = useState(0)
  const sentences = useMemo(() => getSentences(transcript, language), [transcript, language])
  const bottomForTranscription = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)

  useEffect(() => {
    var timer
    const onPlay = e => {
      if (!timer) timer = setInterval(() => setCurrentTime(element.currentTime), 100) // in case it gets called more than once don't set multiple timers
      setCurrentTime(element.currentTime)
    }
    element && element.addEventListener('play', onPlay)
    if (element && element.currentTime > 0) {
      //it's already started playing when this got called
      onPlay({})
    }
    return () => {
      clearInterval(timer)
      element.removeEventListener('play', onPlay)
    }
  }, [transcript, element])

  const showWords = () =>
    transcript &&
    transcript.words &&
    transcript.words.map(wordObj => (
      <div
        className={cx(
          classes.word,
          withinTime(wordObj, currentTime) && classes.litWord,
          endPunctuation.includes(wordObj.word.slice(-1)) && classes.sentenceEnd
        )}
      >
        {wordObj.word}
      </div>
    ))

  const showSentences = () =>
    sentences.reduce((wordDivs, sentence) => {
      sentence.words.forEach(wordObj =>
        wordDivs.push(
          <div
            className={cx(
              classes.word,
              withinSentence(sentence, currentTime) && classes.litWord,
              endPunctuation.includes(wordObj.word.slice(-1)) && classes.sentenceEnd
            )}
          >
            {wordObj.word}
          </div>
        )
      )
      return wordDivs
    }, [])

  return (
    <FitFontToBottom
      className={transcription}
      startFontSize={defaultFontSize}
      bottom={bottomForTranscription}
      dependents={[transcript, bottomForTranscription]}
    >
      {showSentences()}
    </FitFontToBottom>
  )
}

export default Transcription

const useStyles = createUseStyles({
  transcription: {
    textAlign: 'justify',
  },
  word: {
    color: '#333333',
    padding: '0.1em',
    fontWeight: 'normal',
    display: 'inline-block',
  },
  litWord: {
    backgroundColor: 'yellow',
    color: 'black',
  },
  sentenceEnd: {
    paddingRight: '0.25em',
  },
})
