import { useEffect, useState } from 'react';
import { CalendarRange, Dumbbell, LoaderCircle, Waves } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import SportsBookingView from './slot-booking/SportsBookingView';
import SubscriptionRegistrationView from './slot-booking/GymRegistrationView';
import { ErrorState, LoadingState } from './slot-booking/shared';
import {
  createSportsBooking,
  fetchGymRegistrationPage,
  fetchSportsBookingPage,
  fetchSwimmingRegistrationPage,
  getApiErrorMessage,
  submitFacilityRegistration,
} from './slot-booking/api';

const validViews = ['sports', 'gym', 'swimming'];

const SlotBookingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = validViews.includes(searchParams.get('view')) ? searchParams.get('view') : 'sports';

  const [sportsData, setSportsData] = useState(null);
  const [sportsFilters, setSportsFilters] = useState({ sportType: '', date: '' });
  const [sportsLoading, setSportsLoading] = useState(false);
  const [sportsLoaded, setSportsLoaded] = useState(false);
  const [sportsRefreshing, setSportsRefreshing] = useState(false);
  const [sportsError, setSportsError] = useState('');
  const [sportsSubmission, setSportsSubmission] = useState({
    submitting: false,
    success: '',
    error: '',
  });

  const [gymData, setGymData] = useState(null);
  const [gymLoading, setGymLoading] = useState(false);
  const [gymLoaded, setGymLoaded] = useState(false);
  const [gymRefreshing, setGymRefreshing] = useState(false);
  const [gymError, setGymError] = useState('');
  const [gymSubmission, setGymSubmission] = useState({
    submitting: false,
    success: '',
    error: '',
  });

  const [swimmingData, setSwimmingData] = useState(null);
  const [swimmingLoading, setSwimmingLoading] = useState(false);
  const [swimmingLoaded, setSwimmingLoaded] = useState(false);
  const [swimmingRefreshing, setSwimmingRefreshing] = useState(false);
  const [swimmingError, setSwimmingError] = useState('');
  const [swimmingSubmission, setSwimmingSubmission] = useState({
    submitting: false,
    success: '',
    error: '',
  });

  const setView = (view) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('view', view);
    setSearchParams(nextParams, { replace: true });
  };

  const loadSports = async (nextFilters = {}, options = {}) => {
    const background = options.background === true || (options.background == null && Boolean(sportsData));
    const requestFilters = {
      sportType: nextFilters.sportType ?? sportsFilters.sportType,
      date: nextFilters.date ?? sportsFilters.date,
    };

    if (background) {
      setSportsRefreshing(true);
    } else {
      setSportsLoading(true);
    }

    setSportsError('');

    try {
      const payload = await fetchSportsBookingPage(requestFilters);
      setSportsData(payload);
      setSportsFilters({
        sportType: payload?.selectedSport || requestFilters.sportType || '',
        date: payload?.selectedDate || requestFilters.date || '',
      });
      setSportsLoaded(true);
    } catch (error) {
      setSportsError(getApiErrorMessage(error, 'Failed to load sports booking data.'));
      setSportsLoaded(true);
    } finally {
      setSportsLoading(false);
      setSportsRefreshing(false);
    }
  };

  const loadGym = async (options = {}) => {
    const background = options.background === true || (options.background == null && Boolean(gymData));

    if (background) {
      setGymRefreshing(true);
    } else {
      setGymLoading(true);
    }

    setGymError('');

    try {
      const payload = await fetchGymRegistrationPage();
      setGymData(payload);
      setGymLoaded(true);
    } catch (error) {
      setGymError(getApiErrorMessage(error, 'Failed to load gym registration data.'));
      setGymLoaded(true);
    } finally {
      setGymLoading(false);
      setGymRefreshing(false);
    }
  };

  const loadSwimming = async (options = {}) => {
    const background = options.background === true || (options.background == null && Boolean(swimmingData));

    if (background) {
      setSwimmingRefreshing(true);
    } else {
      setSwimmingLoading(true);
    }

    setSwimmingError('');

    try {
      const payload = await fetchSwimmingRegistrationPage();
      setSwimmingData(payload);
      setSwimmingLoaded(true);
    } catch (error) {
      setSwimmingError(getApiErrorMessage(error, 'Failed to load swimming registration data.'));
      setSwimmingLoaded(true);
    } finally {
      setSwimmingLoading(false);
      setSwimmingRefreshing(false);
    }
  };

  useEffect(() => {
    if (!searchParams.get('view')) {
      setView('sports');
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (currentView === 'sports' && !sportsLoaded && !sportsLoading) {
      loadSports();
    }

    if (currentView === 'gym' && !gymLoaded && !gymLoading) {
      loadGym();
    }

    if (currentView === 'swimming' && !swimmingLoaded && !swimmingLoading) {
      loadSwimming();
    }
  }, [currentView, gymLoaded, gymLoading, sportsLoaded, sportsLoading, swimmingLoaded, swimmingLoading]);

  const handleSportsFiltersChange = (nextFilters) => {
    setSportsSubmission((current) => ({ ...current, success: '', error: '' }));
    loadSports(nextFilters, { background: Boolean(sportsData) });
  };

  const handleSportsBooking = async ({ slotId, bookingDate, isGroupBooking, participantCount }) => {
    setSportsSubmission({ submitting: true, success: '', error: '' });

    try {
      await createSportsBooking({ slotId, bookingDate, isGroupBooking, participantCount });
      setSportsSubmission({
        submitting: false,
        success: 'Your booking was created successfully. The slot grid has been refreshed.',
        error: '',
      });
      await loadSports({}, { background: true });
    } catch (error) {
      setSportsSubmission({
        submitting: false,
        success: '',
        error: getApiErrorMessage(error, 'Could not complete the booking.'),
      });
    }
  };

  const handleGymSubmit = async ({ facilityType, plan, slotId, medicalCert, paymentReceipt }) => {
    setGymSubmission({ submitting: true, success: '', error: '' });

    try {
      await submitFacilityRegistration({ facilityType, plan, slotId, medicalCert, paymentReceipt });
      setGymSubmission({
        submitting: false,
        success: 'Your gym registration was submitted and the latest status has been loaded.',
        error: '',
      });
      await loadGym({ background: true });
    } catch (error) {
      setGymSubmission({
        submitting: false,
        success: '',
        error: getApiErrorMessage(error, 'Could not submit the gym registration.'),
      });
    }
  };

  const handleSwimmingSubmit = async ({ facilityType, plan, slotId, medicalCert, paymentReceipt }) => {
    setSwimmingSubmission({ submitting: true, success: '', error: '' });

    try {
      await submitFacilityRegistration({ facilityType, plan, slotId, medicalCert, paymentReceipt });
      setSwimmingSubmission({
        submitting: false,
        success: 'Your swimming registration was submitted and the latest status has been loaded.',
        error: '',
      });
      await loadSwimming({ background: true });
    } catch (error) {
      setSwimmingSubmission({
        submitting: false,
        success: '',
        error: getApiErrorMessage(error, 'Could not submit the swimming registration.'),
      });
    }
  };

  const sectionClassName = (view) =>
    `group rounded-3xl border p-5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
      currentView === view
        ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
        : 'border-gray-200 bg-white text-gray-700 shadow-sm hover:border-brand-200 hover:bg-brand-50'
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">Facilities</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-800">Slot booking and registration</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sports booking, gym registration, and swimming registration now live as separate sections so each flow feels more isolated and easier to test.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <button type="button" onClick={() => setView('sports')} className={sectionClassName('sports')}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={`inline-flex rounded-2xl p-3 ${currentView === 'sports' ? 'bg-white/15' : 'bg-brand-50 text-brand-600'}`}>
                <CalendarRange size={18} />
              </div>
              <h2 className="mt-4 text-lg font-bold">Sports Slot Booking</h2>
              <p className={`mt-2 text-sm ${currentView === 'sports' ? 'text-white/80' : 'text-gray-500'}`}>
                Courts, date filters, availability, booking rules, and recent activity.
              </p>
            </div>
            {sportsRefreshing && currentView === 'sports' ? <LoaderCircle size={18} className="animate-spin" /> : null}
          </div>
        </button>

        <button type="button" onClick={() => setView('gym')} className={sectionClassName('gym')}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={`inline-flex rounded-2xl p-3 ${currentView === 'gym' ? 'bg-white/15' : 'bg-brand-50 text-brand-600'}`}>
                <Dumbbell size={18} />
              </div>
              <h2 className="mt-4 text-lg font-bold">Gym Registration</h2>
              <p className={`mt-2 text-sm ${currentView === 'gym' ? 'text-white/80' : 'text-gray-500'}`}>
                Plans, occupancy, document uploads, and active subscription status.
              </p>
            </div>
            {gymRefreshing && currentView === 'gym' ? <LoaderCircle size={18} className="animate-spin" /> : null}
          </div>
        </button>

        <button type="button" onClick={() => setView('swimming')} className={sectionClassName('swimming')}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={`inline-flex rounded-2xl p-3 ${currentView === 'swimming' ? 'bg-white/15' : 'bg-brand-50 text-brand-600'}`}>
                <Waves size={18} />
              </div>
              <h2 className="mt-4 text-lg font-bold">Swimming Registration</h2>
              <p className={`mt-2 text-sm ${currentView === 'swimming' ? 'text-white/80' : 'text-gray-500'}`}>
                Plans, occupancy, document uploads, and active swimming subscription status.
              </p>
            </div>
            {swimmingRefreshing && currentView === 'swimming' ? <LoaderCircle size={18} className="animate-spin" /> : null}
          </div>
        </button>
      </div>

      {currentView === 'sports' ? (
        sportsLoading && !sportsData ? (
          <LoadingState label="Loading sports booking data..." />
        ) : sportsError && !sportsData ? (
          <ErrorState message={sportsError} onRetry={() => loadSports()} retryLabel="Reload sports view" />
        ) : (
          <SportsBookingView
            data={sportsData}
            filters={sportsFilters}
            loading={sportsLoading}
            refreshing={sportsRefreshing || sportsLoading}
            submission={sportsSubmission}
            onFiltersChange={handleSportsFiltersChange}
            onRefresh={() => loadSports({}, { background: Boolean(sportsData) })}
            onCreateBooking={handleSportsBooking}
          />
        )
      ) : currentView === 'gym' ? (
        gymLoading && !gymData ? (
          <LoadingState label="Loading gym registration data..." />
        ) : gymError && !gymData ? (
          <ErrorState message={gymError} onRetry={() => loadGym()} retryLabel="Reload gym view" />
        ) : (
          <SubscriptionRegistrationView
            data={gymData}
            loading={gymLoading}
            refreshing={gymRefreshing || gymLoading}
            submission={gymSubmission}
            onRefresh={() => loadGym({ background: Boolean(gymData) })}
            onSubmit={handleGymSubmit}
            facilityType="Gym"
          />
        )
      ) : swimmingLoading && !swimmingData ? (
        <LoadingState label="Loading swimming registration data..." />
      ) : swimmingError && !swimmingData ? (
        <ErrorState message={swimmingError} onRetry={() => loadSwimming()} retryLabel="Reload swimming view" />
      ) : (
        <SubscriptionRegistrationView
          data={swimmingData}
          loading={swimmingLoading}
          refreshing={swimmingRefreshing || swimmingLoading}
          submission={swimmingSubmission}
          onRefresh={() => loadSwimming({ background: Boolean(swimmingData) })}
          onSubmit={handleSwimmingSubmit}
          facilityType="SwimmingPool"
        />
      )}
    </div>
  );
};

export default SlotBookingPage;
