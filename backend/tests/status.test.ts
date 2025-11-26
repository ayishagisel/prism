describe('ClientOpportunityStatus', () => {
  describe('State Transitions', () => {
    it('should allow transition from pending to interested', () => {
      const validTransition = canTransition('pending', 'interested');
      expect(validTransition).toBe(true);
    });

    it('should allow transition from pending to accepted', () => {
      const validTransition = canTransition('pending', 'accepted');
      expect(validTransition).toBe(true);
    });

    it('should allow transition from interested to accepted', () => {
      const validTransition = canTransition('interested', 'accepted');
      expect(validTransition).toBe(true);
    });

    it('should allow transition from pending to declined', () => {
      const validTransition = canTransition('pending', 'declined');
      expect(validTransition).toBe(true);
    });

    it('should allow transition from interested to declined', () => {
      const validTransition = canTransition('interested', 'declined');
      expect(validTransition).toBe(true);
    });

    it('should not allow invalid transitions', () => {
      const invalidTransition = canTransition('accepted', 'pending');
      expect(invalidTransition).toBe(false);
    });
  });
});

/**
 * Validate state transitions based on state machine
 */
function canTransition(from: string, to: string): boolean {
  const validTransitions: Record<string, string[]> = {
    pending: ['interested', 'accepted', 'declined', 'no_response'],
    interested: ['accepted', 'declined', 'no_response'],
    accepted: [],
    declined: [],
    no_response: [],
  };

  return (validTransitions[from] || []).includes(to);
}
