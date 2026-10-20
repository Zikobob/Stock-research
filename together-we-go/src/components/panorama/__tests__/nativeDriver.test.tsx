/**
 * The 360° screen once crashed on a real phone with "Attempting to run JS driven animation on animated node that has been moved to
 * 'native' earlier": the scene mixes the day/night and position values with looping lights that run on the native driver, and one
 * value cannot be driven both ways. The web build ignores `useNativeDriver`, so only a test that turns the native driver on sees it.
 */
import { createElement, type ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import PanoramaScreen from '@/app/panorama';

// (jest.mock calls are lifted above the imports.) Pretend the phone's native animation module exists, so `useNativeDriver: true` really marks values as native.
jest.mock('react-native/Libraries/Animated/NativeAnimatedModule', () => ({
  __esModule: true,
  default: new Proxy({}, { get: (_t, name) => (name === 'then' ? undefined : jest.fn()) }),
}));
jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({ ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'), findNodeHandle: () => 1 }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  // runs the screen's focus effect once, like a screen that is being looked at
  useFocusEffect: (effect: () => void | (() => void)) => jest.requireActual('react').useEffect(effect, [effect]),
  router: { canGoBack: () => true, back: jest.fn(), replace: jest.fn() },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const press = async (root: ReactTestRenderer, label: string | RegExp) => {
  const hit = root.root.findAll((n) => typeof n.props.onPress === 'function' && (typeof label === 'string' ? n.props.accessibilityLabel === label : label.test(n.props.accessibilityLabel ?? '')))[0];
  expect(hit).toBeDefined();
  await act(async () => {
    hit.props.onPress();
  });
};

describe('360° screen on the native animation driver', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('can switch day/night and look around while the lights loop natively', async () => {
    let root!: ReactTestRenderer;
    await act(async () => {
      root = create(createElement(PanoramaScreen as () => ReactNode), { createNodeMock: () => ({}) });
    });
    // let the looping lights start (they start on a timer after the first render)
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await press(root, /Switch to (day|night)/); // restarts the day/night cross-fade on a value the lights already made native
    await press(root, 'Look right'); // glides the position value, which shares a style with the day/night value
    await press(root, 'Look left');
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    act(() => root.unmount());
  });
});
