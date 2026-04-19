import { Link } from 'react-router-dom';
import { RefreshButton } from '@/components/ui/refresh-button';
import { useProfilePageState } from '@/hooks/useProfilePageState';
import { ProfileHeroBanner } from '@/components/profile/ProfileHeroBanner';
import { PersonalInfoCard } from '@/components/profile/PersonalInfoCard';
import { SubscriptionDashboardCard } from '@/components/profile/SubscriptionDashboardCard';
import { CompactPricingSection } from '@/components/profile/CompactPricingSection';
import {
  ProfileHeroBannerSkeleton,
  ProfileCardSkeleton,
  SubscriptionCardSkeleton,
  SubscriptionPlansCardSkeleton,
} from '@/components/ui/loading-skeleton';

export function ProfileView() {
  const state = useProfilePageState();
  const showSkeleton = state.loading && !state.profile;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Profile</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your profile and subscription</p>
          <p className="text-muted-foreground text-sm">
            Your account details and subscription.
            <Link to="/app/settings" className="text-primary hover:underline ml-1">
              Looking for trade options?
            </Link>
          </p>
        </div>
        <RefreshButton onRefresh={state.refetchSubscription} isFetching={state.profileFetching || state.subscriptionFetching} />
      </div>

      {showSkeleton ? (
        <ProfileHeroBannerSkeleton />
      ) : (
        <ProfileHeroBanner
          name={state.profile?.name || ''}
          email={state.profile?.email || ''}
          memberSince={state.memberSinceDate}
          subscriptionStatus={state.subscription?.status}
          isEditing={state.isEditing}
          onEditClick={state.startEditing}
        />
      )}

      {showSkeleton ? (
        <ProfileCardSkeleton />
      ) : (
        <PersonalInfoCard
          name={state.profile?.name || ''}
          email={state.profile?.email || ''}
          isEditing={state.isEditing}
          editFormData={state.editFormData}
          onEditFormChange={state.setEditFormData}
          onSave={state.handleSaveProfile}
          onCancel={state.cancelEditing}
          onLogout={state.handleLogout}
          isSaving={state.isSavingProfile}
        />
      )}

      {showSkeleton ? (
        <SubscriptionCardSkeleton />
      ) : (
        <SubscriptionDashboardCard
          subscription={state.subscription ?? null}
          currencySymbol={state.currencySymbol}
          isManaging={state.managingSubscription}
          isSubscribing={state.isSubscribing}
          onPause={state.handlePauseSubscription}
          onCancel={state.handleCancelSubscription}
          onResume={state.handleResumeSubscription}
          onUndoCancellation={state.handleUndoCancellation}
          onRetryPayment={state.handleRetryPayment}
          isFetching={state.subscriptionFetching}
        />
      )}

      {state.showPricingSection && (
        state.plansLoading ? (
          <SubscriptionPlansCardSkeleton />
        ) : (
          <CompactPricingSection
            currency={state.currency}
            currencySymbol={state.currencySymbol}
            onSubscribe={state.handleSubscribe}
            isProcessing={state.isSubscribing}
            availablePlans={state.availablePlans}
          />
        )
      )}
    </div>
  );
}
