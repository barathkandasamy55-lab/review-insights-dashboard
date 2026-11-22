import { classifyReview, classifyText, isTrivialText } from './topic-classifier';

describe('topic classifier', () => {
  it('treats filler text as empty', () => {
    for (const t of ['Nothing', 'nothing.', 'N/A', 'None', 'No complaints', '', null, undefined, 'ok']) {
      expect(isTrivialText(t as string)).toBe(true);
      expect(classifyText(t as string)).toEqual([]);
    }
  });

  it('finds cleanliness and noise complaints', () => {
    const topics = classifyText('The room was dirty and the walls are thin, we heard noise all night.');
    expect(topics).toEqual(expect.arrayContaining(['cleanliness', 'noise']));
  });

  it('finds check-in problems', () => {
    expect(classifyText('Check-in was confusing, the key code did not work')).toContain('checkin');
  });

  it('finds staff and value mentions', () => {
    expect(classifyText('Reception staff were rude')).toContain('staff');
    expect(classifyText('Not worth the price')).toContain('value');
  });

  it('uses the liked/disliked field as polarity', () => {
    const result = classifyReview({ positiveText: 'Great location', negativeText: 'Dirty bathroom' });
    expect(result).toEqual(
      expect.arrayContaining([
        { topic: 'location', polarity: 'POSITIVE' },
        { topic: 'cleanliness', polarity: 'NEGATIVE' },
      ]),
    );
    expect(result).not.toContainEqual({ topic: 'location', polarity: 'NEGATIVE' });
  });

  it('does not match inside unrelated words', () => {
    expect(classifyText('The scenery was lovely')).not.toContain('cleanliness');
  });
});
